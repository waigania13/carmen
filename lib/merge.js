var mp32 = Math.pow(2,32);
var termops = require('./util/termops'),
    token = require('./util/token'),
    feature = require('./util/feature'),
    uniq = require('./util/uniq'),
    ops = require('./util/ops'),
    queue = require('d3-queue').queue,
    indexdocs = require('./indexer/indexdocs'),
    split = require('split'),
    extend = require('util')._extend,
    dawgCache = require('dawg-cache'),
    fork = require('child_process').fork,
    fs = require('fs'),
    TIMER = process.env.TIMER;

module.exports = merge;
module.exports.multimerge = multimerge;
module.exports.getOutputConf = getOutputConf;

var pairwiseGeocoderIterator = function(from1, from2, type) {
    var iterators = [from1.geocoderDataIterator(type), from2.geocoderDataIterator(type)]

    var nexts = [null, null]

    var fetchq = queue();
    var nextq = queue(1);

    var advance = function(num) {
        fetchq.defer(function(cb) { iterators[num].asyncNext(function(err, row) {
            nexts[num] = row;
            cb(err);
        })});
    }
    advance(0);
    advance(1);

    return {asyncNext: function(callback) {
        nextq.defer(function(cb) {
            fetchq.awaitAll(function(err) {
                if (err) callback(err);

                // reset the fetch queue so we can call await on it again
                fetchq = queue();
                if (nexts[0].done && nexts[1].done) {
                    callback(err, {value: undefined, done: true});
                } else {
                    if (!nexts[0].done && (nexts[1].done || nexts[0].value.shard < nexts[1].value.shard)) {
                        // return and advance next[0]
                        var out = nexts[0];
                        advance(0);
                        callback(err, {value: {shard: out.value.shard, data1: out.value.data, data2: undefined}, done: false});
                    } else if (!nexts[1].done && (nexts[0].done || nexts[1].value.shard < nexts[0].value.shard)) {
                        // return and advance next[0]
                        var out = nexts[1];
                        advance(1);
                        callback(err, {value: {shard: out.value.shard, data2: out.value.data, data1: undefined}, done: false});
                    } else if (nexts[0].value.shard == nexts[1].value.shard) {
                        var out1 = nexts[0], out2 = nexts[1];
                        advance(0);
                        advance(1);
                        callback(err, {value: {shard: out1.value.shard, data1: out1.value.data, data2: out2.value.data}, done: false});
                    } else {
                        throw new Error("merge error");
                    }
                }
                cb();
            })
        })
    }}
}

var mergeType = function(from1, from2, to, type, mergeOp, completeCallback) {
    var iterator = pairwiseGeocoderIterator(from1, from2, type);
    var nextq = queue(1);
    var writeq = queue();

    var next = function() {
        nextq.defer(function(cb) {
            iterator.asyncNext(function(err, row) {
                if (err) throw err;

                if (row.done) {
                    writeq.awaitAll(function() {
                        completeCallback();
                    })
                } else {
                    var data;
                    if (row.value.data1 === undefined) {
                        data = row.value.data2;
                    } else if (row.value.data2 === undefined) {
                        data = row.value.data1;
                    } else {
                        data = mergeOp(row.value.shard, row.value.data1, row.value.data2);
                    }
                    writeq.defer(function(writeCb) {
                        to.putGeocoderData(type, row.value.shard, data, writeCb);
                    })
                    next();
                    cb();
                }
            })
        })
    }
    next();
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

            var out = to._geocoder.pack("freq", shard);

            [from1, from2, to].forEach(function(source) { source._geocoder.unload("freq", shard); });

            return out;
        }, function() { to._commit ? to._commit(cb) : cb(); });
    });

    // merge grid
    q.defer(function(cb) {
        mergeType(from1, from2, to, "grid", function(shard, data1, data2) {
            // load the two source caches, iterate over their ids, and for each id,
            // combine the list items
            from1._geocoder.loadSync(data1, "grid", shard);
            from2._geocoder.loadSync(data2, "grid", shard);

            var ids = uniq(from1._geocoder.list("grid", shard).concat(from2._geocoder.list("grid", shard)));
            ids.forEach(function(id) {
                id = +id;
                var gdata1 = from1._geocoder._get("grid", shard, id) || [],
                    gdata2 = from2._geocoder._get("grid", shard, id) || [];
                var newData = gdata1.concat(gdata2);
                to._geocoder.set('grid', id, newData, true);
            });

            var out = to._geocoder.pack("grid", shard);

            [from1, from2, to].forEach(function(source) { source._geocoder.unload("grid", shard); });

            return out;
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
        var dawg1 = from1._dictcache,
            dawg2 = from2._dictcache;

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
        to.putGeocoderData("stat", 0, mergedDawg.toCompactDawgBuffer(), function() {
            to._commit ? to._commit(cb) : cb();
        });
    });

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

var _randomChars = function(length) {
    var s = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    return Array.apply(null, {length: length}).map(function() { return s.charAt(Math.floor(Math.random() * s.length)); }).join('');
}

function multimerge(fromFiles, toFile, options, callback) {
    var toMerge = [], inProgress = 0;
    fromFiles.forEach(function(fromFile) { toMerge.push(fromFile); });

    var tmpDir = '/tmp/mrg.' + _randomChars(9),
        tmpCounter = 0;
    if (!fs.existsSync(tmpDir)){
        fs.mkdirSync(tmpDir);
    }

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
                                // clean up intermediate products

                                fs.readdir(tmpDir, function(err, files) {
                                    var deleteQ = queue();
                                    for (var i = 0; i < files.length; i++) deleteQ.defer(function(file, cb) {
                                        fs.unlink(tmpDir + '/' + file, cb);
                                    }, files[i]);
                                    deleteQ.awaitAll(function() {
                                        fs.rmdir(tmpDir, function() {
                                            // done with clean up; call callback
                                            console.log('Merge worker cleanup complete');
                                            callback();
                                        });
                                    });
                                });
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
                    var filename = tmpDir + '/merge-' + ("0000" + tmpCounter).substr(-4,4) + '.mbtiles';
                    tmpCounter += 1;
                    enqueueTask(from1File, from2File, filename, false);
                })(from1File, from2File);
            }

        }
    }
    queueJobs();
}