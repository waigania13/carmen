var mp32 = Math.pow(2,32);
var termops = require('./util/termops'),
    token = require('./util/token'),
    feature = require('./util/feature'),
    uniq = require('./util/uniq'),
    ops = require('./util/ops'),
    queue = require('queue-async'),
    indexdocs = require('./indexer/indexdocs'),
    split = require('split'),
    crypto = require('crypto'),
    extend = require('util')._extend,
    dawgCache = require('dawg-cache'),
    fork = require('child_process').fork,
    TIMER = process.env.TIMER;

module.exports = merge;
module.exports.multimerge = multimerge;
module.exports.getOutputConf = getOutputConf;

var pairwiseGDFE = function(from1, from2, type, callback, completeCallback) {
    var q = [[], []], done = [false, false];
    var mergeRows = function() {
        while (q[0].length && q[1].length) {
            if (q[0][0].shard < q[1][0].shard) {
                var data0 = q[0].shift();
                callback(data0.shard, data0.data, undefined);
            } else if (q[0][0].shard > q[1][0].shard) {
                var data1 = q[1].shift();
                callback(data1.shard, undefined, data1.data);
            } else if (q[0][0].shard == q[0][0].shard) {
                var data0 = q[0].shift(),
                    data1 = q[1].shift();
                callback(data0.shard, data0.data, data1.data);
            }
        }
    }
    var onRow = function(shard, data, myIdx) {
        var otherIdx = myIdx == 0 ? 1 : 0;
        q[myIdx].push({shard: shard, data: data});
        if (q[otherIdx].length) {
            mergeRows();
        }
    }

    var onComplete = function(myIdx) {
        var otherIdx = myIdx == 0 ? 1 : 0;
        done[myIdx] = true;
        if (done[otherIdx]) {
            mergeRows();
            // one or the other of the queues should be empty, but the other might not be
            var remaining = q[myIdx].length ? myIdx : otherIdx;
            while (q[remaining].length) {
                var data = q[remaining].shift();
                callback(data.shard, myIdx == 0 ? data.data : undefined, myIdx == 0 ? undefined : data.data);
            }
            if (completeCallback) {
                completeCallback();
            }
        }
    }

    from1.geocoderDataForEach(
        type,
        function(shard, data) { onRow(shard, data, 0); },
        function() { onComplete(0); }
    );
    from2.geocoderDataForEach(
        type,
        function(shard, data) { onRow(shard, data, 1); },
        function() { onComplete(1); }
    );
}

var mergeType = function(from1, from2, to, type, mergeOp, completeCallback) {
    var q = queue(0);
    pairwiseGDFE(from1, from2, type, function(shard, data1, data2) {
        var data;
        if (data1 === undefined) {
            data = data2;
        } else if (data2 === undefined) {
            data = data1;
        } else {
            data = mergeOp(shard, data1, data2);
        }
        q.defer(function(cb) {
            to.putGeocoderData(type, shard, data, cb);
        })
    }, function() { q.awaitAll(completeCallback); });
}

function merge(geocoder, from1, from2, to, options, callback) {
    var q = queue(1);

    // merge freq
    q.defer(function(cb) {
        mergeType(from1, from2, to, "freq", function(shard, data1, data2) {
            // load both of the buffers into their respective caches
            var combined = {};
            [from1, from2].forEach(function(from) {
                from._geocoder.loadSync(from == from1 ? data1 : data2, "freq", shard)
                from._geocoder.list("freq", shard).forEach(function(id) {
                    combined[id] = true;
                });
            });

            Object.keys(combined).forEach(function(id) {
                id = +id;
                if (id == 1) {
                    // 1 is a max score, so take the higher rather than summing
                    var total = Math.max((from1._geocoder._get("freq", shard, id) || [0])[0],
                        (from2._geocoder._get("freq", shard, id) || [0])[0]);
                } else {
                    var total = (from1._geocoder._get("freq", shard, id) || [0])[0] +
                        (from2._geocoder._get("freq", shard, id) || [0])[0];
                }
                to._geocoder._set("freq", shard, id, [total]);
            });

            return to._geocoder.pack("freq", shard);
        }, function() { to._commit ? to._commit(cb) : cb(); });
    });

    // merge grid
    q.defer(function(cb) {
        mergeType(from1, from2, to, "grid", function(shard, data1, data2) {
            // load one of the buffers into the destination cache, then append from the second onto it
            to._geocoder.loadSync(data1, "grid", shard);
            from2._geocoder.loadSync(data2, "grid", shard);

            from2._geocoder.list("grid", shard).forEach(function(id) {
                id = +id;
                var newData = from2._geocoder._get("grid", shard, id)
                to._geocoder.set('grid', id, newData, true);
            });

            return to._geocoder.pack("grid", shard);
        }, function() { to._commit ? to._commit(cb) : cb(); });
    });

    // merge features
    q.defer(function(cb) {
        mergeType(from1, from2, to, "feature", function(shard, data1, data2) {
            var current1 = JSON.parse(data1);
            var current2 = JSON.parse(data2);

            for (var i = 0; i < current2.length; i++) {
                current1[current2[i].id] = current2[i];
            }
            return JSON.stringify(current1);
        }, function() { to._commit ? to._commit(cb) : cb(); });
    });

    // merge dawg
    q.defer(function(cb) {
        mergeType(from1, from2, to, "stat", function(shard, data1, data2) {
            if (shard != 0) {
                throw new Error("I don't know how to merge stat shards other than 0");
            }

            var dawg1 = new dawgCache.CompactDawg(data1),
                dawg2 = new dawgCache.CompactDawg(data2);

            var mergedDawg = new dawgCache.Dawg();

            var iterator1 = dawg1.iterator(),
                iterator2 = dawg2.iterator();

            var next1 = iterator1.next(),
                next2 = iterator2.next();

            var remainingNext, remainingIterator;

            while (true) {
                if (next1.done) {
                    remainingNext = next2;
                    remainingIterator = iterator2;
                    break;
                }
                if (next2.done) {
                    remainingNext = next1;
                    remainingIterator = iterator1;
                    break;
                }
                if (next1.value < next2.value) {
                    mergedDawg.insert(next1.value);
                    next1 = iterator1.next();
                } else if (next1.value > next2.value) {
                    mergedDawg.insert(next2.value);
                    next2 = iterator2.next();
                } else if (next1.value == next2.value) {
                    // pull both but only add once
                    mergedDawg.insert(next1.value);
                    next1 = iterator1.next();
                    next2 = iterator2.next();
                } else {
                    throw new Error("DAWG value comparison error");
                }
            }

            // one structure is done, so flush the remaining input structure
            while (!remainingNext.done) {
                mergedDawg.insert(remainingNext.value);
                remainingNext = remainingIterator.next();
            }

            // we're done; finalize and collapse
            mergedDawg.finish();
            return mergedDawg.toCompactDawgBuffer();
        }, function() { to._commit ? to._commit(cb) : cb(); })
    })

    q.awaitAll(function() {
        to.stopWriting(callback);
    });
}

function getOutputConf(filename, options, callback) {
    var Carmen = require('../index.js');

    var tmp = Carmen.auto(filename, function() {
        var outputConf = {
            to: tmp
        };

        var outputConfig = extend({}, options);
        delete outputConfig.output;
        outputConf.to.startWriting(writeMeta);

        function writeMeta(err) {
            if (err) throw err;
            outputConf.to.putInfo(outputConfig, stopWriting);
        }

        function stopWriting(err) {
            if (err) throw err;
            outputConf.to.stopWriting(function() {
                callback(outputConf);
            });
        }
    });
    return tmp;
}

function multimerge(fromFiles, toFile, options, callback) {
    var toMerge = [], inProgress = 0;
    fromFiles.forEach(function(fromFile) { toMerge.push(fromFile); });

    var q = queue(4);
    var queueJobs = function() {
        while (toMerge.length >= 2) {
            var from1File = toMerge.shift(),
                from2File = toMerge.shift();
            inProgress += 2;

            var enqueueTask = function(from1File, from2File, mergeToFile, isFinal) {
                q.defer(function(from1File, from2File, mergeToFile, cb) {
                    var worker = fork(__dirname + '/merge-worker.js');
                    worker.send({from1File: from1File, from2File: from2File, mergeToFile: mergeToFile, options: options});
                    worker.on('exit', function exit(code) {
                        if (code == 0) {
                            inProgress -= 2;

                            if (isFinal) {
                                // we're done
                                callback();
                            } else {
                                toMerge.push(mergeToFile);
                                queueJobs();
                            }
                            return cb();
                        }
                        console.warn('Merge worker exited with ' + code);
                        process.exit(code ? code : 1);
                    });
                }, from1File, from2File, mergeToFile);
            }

            if (inProgress == 2 && toMerge.length == 0) {
                // nobody else is working on anything and we've grabbed the last
                // two things to merge, so merge into the final output
                enqueueTask(from1File, from2File, toFile, true);
            } else {
                // we need a temporary thing to merge into
                // (wrap in an iffe to preserve the current from1 and from2)
                (function(from1File, from2File) {
                    var filename = '/tmp/merge-' +
                        crypto.randomBytes(4).readUInt32LE(0) + '' +
                        crypto.randomBytes(4).readUInt32LE(0) + '.mbtiles';
                    enqueueTask(from1File, from2File, filename, false);
                })(from1File, from2File);
            }

        }
    }
    queueJobs();
}