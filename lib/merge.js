'use strict';
const stream = require('stream');
const queue = require('d3-queue').queue,
    extend = require('util')._extend,
    dawgCache = require('dawg-cache'),
    carmenDawg = require('./util/dawg'),
    cxxcache = require('./util/cxxcache'),
    fork = require('child_process').fork,
    fs = require('fs-extra'),
    iterTools = require('iter-tools');

const Map = require('es6-native-map');
const Set = require('es6-native-set');

module.exports = merge;
module.exports.multimerge = multimerge;
module.exports.getOutputConf = getOutputConf;

/**
 * Generate a random string of characters. Used to create a randomly-named tmp directory
 *
 * @param {number} length - length of desired random character string
 * @returns {string} random string of characters from [a-zA-Z0-9]
 */
const _randomChars = function(length) {
    const s = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.apply(null, { length: length }).map(() => { return s.charAt(Math.floor(Math.random() * s.length)); }).join('');
};

/**
 * Get a CarmenSource's base filename if it exists. If not, get a random path in /tmp
 *
 * @param {CarmenSource} source - a Geocoder source
 * @returns {string} either the base filename of the source, or a random location in /tmp
 */
const getBaseFilenameOrTmp = function(source) {
    return source.getBaseFilename ? source.getBaseFilename() : '/tmp/tmp-idx.' + _randomChars(9);
};

/**
 * Creates a readable stream of two sources' feature data for some index type.
 * The documents of the two indexes joined using their shard value as the key.
 * The join is a {@link https://www.w3schools.com/sql/sql_join_full.asp full
 * outer join}, meaning that all elements of the two sources are returned. A
 * stream of records is returned like:
 *
 * ```
 * { shard: <shard_value>, data1: <from1_document>, data2: <from2_docment> }
 * ```
 *
 * The full outer join means:
 *
 * | if a shard value...              | `data1`     | `data2`     |
 * |----------------------------------|-------------|-------------|
 * | ...exists in `from1` and `from2` | `Feature`   | `Feature`   |
 * | ...only exists in `from1`        | `Feature`   | `undefined` |
 * | ...only exists in `from2`        | `undefined` | `Feature`   |
 *
 * @param {CarmenSource} from1 - a source index
 * @param {CarmenSource} from2 - a source index
 * @param {string} type - an index type (eg. "address", "place" or "country")
 * @returns {stream.Readable} a readable stream of objects `{shard: number, data1: (Feature|undefined), data2: (Feature|undefined)}`
 */
const pairwiseGeocoderIterator = function(from1, from2, type) {
    const readStream = new stream.Readable({ objectMode:true });
    const iterators = [from1.geocoderDataIterator(type), from2.geocoderDataIterator(type)];

    const nexts = [null, null];

    let fetchq = queue();
    const nextq = queue(1);

    /**
     * Advance one of the two iterators
     *
     * @param {number} num - the index of the iterator. either `0` or `1`
     */
    const advance = function(num) {
        fetchq.defer((cb) => { iterators[num].asyncNext((err, row) => {
            nexts[num] = row;
            cb(err);
        });});
    };
    advance(0);
    advance(1);

    readStream._read = function() {
        nextq.defer((cb) => {
            fetchq.awaitAll((err) => {
                if (err) readStream.emit('error', err);

                // reset the fetch queue so we can call await on it again
                fetchq = queue();
                let out;
                if (nexts[0].done && nexts[1].done) {
                    // both sides are done
                    readStream.push(null);
                } else if (!nexts[0].done && (nexts[1].done || nexts[0].value.shard < nexts[1].value.shard)) {
                    // return and advance next[0]
                    out = nexts[0];
                    advance(0);
                    readStream.push({ shard: out.value.shard, data1: out.value.data, data2: undefined });
                } else if (!nexts[1].done && (nexts[0].done || nexts[1].value.shard < nexts[0].value.shard)) {
                    // return and advance next[1]
                    out = nexts[1];
                    advance(1);
                    readStream.push({ shard: out.value.shard, data2: out.value.data, data1: undefined });
                } else if (nexts[0].value.shard === nexts[1].value.shard) {
                    // return and advance both
                    const out1 = nexts[0], out2 = nexts[1];
                    advance(0);
                    advance(1);
                    readStream.push({ shard: out1.value.shard, data1: out1.value.data, data2: out2.value.data });
                } else {
                    readStream.emit(new Error('merge error'));
                }

                cb();
            });
        });
    };

    return readStream;
};

/**
 * Merges the data from two sources for a given type and writes to another
 * source. Uses the stream of records output by {@link pairwiseGeocoderIterator},
 * performing a specified operation when `data1` and `data2` are both defined
 * and outputs the result. When only one of the two are defined, just outputs
 * that data.
 *
 * @param {CarmenSource} from1 - one of the sources to be merged
 * @param {CarmenSource} from2 - the other source to be merged
 * @param {CarmenSource} to - the destination of the merged data
 * @param {string} type - an index type (eg, "address", "place", "country")
 * @param {function(object, object)} mergeOp - applies specific logic for merging data from two sources
 * @param {function} completeCallback - a callback function
 */
const mergeType = function(from1, from2, to, type, mergeOp, completeCallback) {
    const pairStream = pairwiseGeocoderIterator(from1, from2, type);
    const mergeQueue = queue();
    const mergeStream = new stream.Transform({ objectMode:true });
    mergeStream.pending = 0;
    mergeStream._transform = function(row, enc, callback) {
        if (mergeStream.pending > 1000) {
            return setImmediate(mergeStream._transform.bind(mergeStream), row, enc, callback);
        }
        mergeStream.pending++;
        mergeQueue.defer((shard, data1, data2, qcallback) => {
            if (data1 !== undefined && data2 !== undefined) {
                // there is a doc from each source with this shard value, so we
                // have to apply mergeOp to produce a new doc that combine them.
                mergeOp(shard, data1, data2, (err, data3) => {
                    // this is where errors come back from carmen-cache
                    if (err) { throw err; }
                    to.putGeocoderData(type, shard, data3, (err) => {
                        if (err) mergeStream.emit('error', err);
                        mergeStream.pending--;
                        qcallback(err);
                    });
                });
            } else {
                // only one of the sources has a doc for this shard value.
                // whichever is defined gets written to the new source
                to.putGeocoderData(type, shard, data1 || data2, (err) => {
                    if (err) mergeStream.emit('error', err);
                    mergeStream.pending--;
                    qcallback(err);
                });
            }
        }, row.shard, row.data1, row.data2);
        callback();
    };
    mergeStream._flush = function(callback) {
        mergeQueue.awaitAll(callback);
    };

    pairStream.pipe(mergeStream).pipe(new stream.PassThrough());
    pairStream.on('error', done);
    mergeStream.on('end', done);
    mergeStream.on('error', done);

    /**
     * Done function
     *
     * @param {Error} err - an error
     */
    function done(err) {
        if (err) throw err;
        completeCallback && completeCallback(err);
        completeCallback = false;
    }
};

/**
 * Merge two CarmenSources
 *
 * @param {Geocoder} geocoder - an instance of carmen Geocoder
 * @param {CarmenSource} from1 - a source index to be merged
 * @param {CarmenSource} from2 - another source to be merged
 * @param {CarmenSource} to - the destination of the merged sources
 * @param {object} options - options
 * @param {function} callback - a callback function
 */
function merge(geocoder, from1, from2, to, options, callback) {
    const q = queue(1);
    const stats = {
        freq: 0,
        grid: 0,
        feature: 0,
        stat: 0
    };

    // merge grid and freq
    const from1Base = getBaseFilenameOrTmp(from1);
    const from2Base = getBaseFilenameOrTmp(from2);
    const toBase = getBaseFilenameOrTmp(to);

    ['grid', 'freq'].forEach((type) => {
        q.defer((cb) => {
            const start = +(new Date());

            // FIXME -- this litters grossness all over /tmp
            const rocks = {
                from1: from1Base + '.' + type + '.rocksdb',
                from2: from2Base + '.' + type + '.rocksdb',
                to: toBase + '.' + type + '.rocksdb'
            };

            if (!fs.existsSync(rocks.from1)) from1._geocoder[type].pack(rocks.from1);
            if (!fs.existsSync(rocks.from2)) from2._geocoder[type].pack(rocks.from2);
            cxxcache.RocksDBCache.merge(
                rocks.from1,
                rocks.from2,
                rocks.to,
                type,
                () => {
                    to._geocoder[type] = new cxxcache.RocksDBCache(to._geocoder[type].id, rocks.to);
                    stats[type] = +(new Date()) - start;
                    cb();
                }
            );
        });
    });

    // merge features
    q.defer((cb) => {
        const start = +(new Date());
        mergeType(from1, from2, to, 'feature', (shard, data1, data2, callback) => {
            data1 = data1.toString();
            data2 = data2.toString();
            callback(null, data1.substr(0, data1.length - 1) + ',' + data2.substr(1));
        }, () => {
            stats.feature = +(new Date()) - start;
            to._commit ? to._commit(cb) : cb();
        });
    });

    // merge dawg
    q.defer((cb) => {
        const start = +(new Date());

        const use_normalization_cache = from1.use_normalization_cache || (from1._info && from1._info.use_normalization_cache);

        let dawg1 = from1._dictcache,
            dawg2 = from2._dictcache;

        if (use_normalization_cache && dawg1.dumpWithNormalizations) {
            let file = toBase + '.tmp1.norm.rocksdb';
            let dump = dawg1.dumpWithNormalizations(file);
            dawg1 = new carmenDawg(dump);
            dawg1.loadNormalizationCache(file);

            file = toBase + '.tmp2.norm.rocksdb';
            dump = dawg2.dumpWithNormalizations(file);
            dawg2 = new carmenDawg(dump);
            dawg2.loadNormalizationCache(file);
        }

        // preload normalization maps
        let norm1 = new Map();
        let norm2 = new Map();

        let norm1Set = new Set();
        let norm2Set = new Set();

        const norm1ToMerged = new Map();
        const norm2ToMerged = new Map();
        const normInBoth = new Map();

        if (use_normalization_cache) {
            // preload normalization maps
            norm1 = new Map(dawg1.normalizationCache.getAll());
            norm2 = new Map(dawg2.normalizationCache.getAll());

            norm1Set = new Set([...norm1.keys(), ...iterTools.flatMap((x) => x, norm1.values())]);
            norm2Set = new Set([...norm2.keys(), ...iterTools.flatMap((x) => x, norm2.values())]);
        }

        const mergedDawg = new dawgCache.Dawg();

        const iterator1 = iterTools.enumerate(dawg1.iterator()),
            iterator2 = iterTools.enumerate(dawg2.iterator());

        let next1 = iterator1.next(),
            next2 = iterator2.next();

        let remainingNext, remainingIterator, remainingMembershipSet, remainingMergeMap;
        let mergedCount = 0;

        while (true) {
            if (next1.done) {
                remainingNext = next2;
                remainingIterator = iterator2;
                remainingMembershipSet = norm2Set;
                remainingMergeMap = norm2ToMerged;
                break;
            }
            if (next2.done) {
                remainingNext = next1;
                remainingIterator = iterator1;
                remainingMembershipSet = norm1Set;
                remainingMergeMap = norm1ToMerged;
                break;
            }
            if (next1.value[1] < next2.value[1]) {
                mergedDawg.insert(next1.value[1]);

                if (norm1Set.has(next1.value[0])) norm1ToMerged.set(next1.value[0], mergedCount);
                mergedCount += 1;

                next1 = iterator1.next();
            } else if (next1.value[1] > next2.value[1]) {
                mergedDawg.insert(next2.value[1]);

                if (norm2Set.has(next2.value[0])) norm2ToMerged.set(next2.value[0], mergedCount);
                mergedCount += 1;

                next2 = iterator2.next();
            } else if (next1.value[1] === next2.value[1]) {
                // pull both but only add once
                mergedDawg.insert(next1.value[1]);

                if (norm1Set.has(next1.value[0])) norm1ToMerged.set(next1.value[0], mergedCount);
                if (norm2Set.has(next2.value[0])) norm2ToMerged.set(next2.value[0], mergedCount);
                normInBoth.set(mergedCount, [next1.value[0], next2.value[0]]);
                mergedCount += 1;

                next1 = iterator1.next();
                next2 = iterator2.next();
            } else {
                throw new Error('DAWG value comparison error');
            }
        }

        // one structure is done, so flush the remaining input structure
        while (!remainingNext.done) {
            mergedDawg.insert(remainingNext.value[1]);

            if (remainingMembershipSet.has(remainingNext.value[0])) remainingMergeMap.set(remainingNext.value[0], mergedCount);
            mergedCount += 1;

            remainingNext = remainingIterator.next();
        }

        // we're done; finalize and collapse
        mergedDawg.finish();
        const dawgFile = toBase + '.dawg';
        const mergedData = mergedDawg.toCompactDawgBuffer(use_normalization_cache);
        fs.writeFile(dawgFile, mergedData, (err) => {
            stats.stat = +(new Date()) - start;

            to._dictcache = new carmenDawg(mergedData);

            if (use_normalization_cache) {
                const normFile = toBase + '.norm.rocksdb';
                const normCache = new cxxcache.NormalizationCache(normFile, false);

                [[norm1, norm1ToMerged], [norm2, norm2ToMerged]].map((args) => {
                    const [normMap, normToMerged] = args;
                    normCache.writeBatch(Array.from(
                        iterTools.map((normalization) => {
                            const mergedKey = normToMerged.get(normalization[0]);
                            let mergedVals;
                            if (normInBoth.has(mergedKey)) {
                                const sourceKeys = normInBoth.get(mergedKey);
                                // this term was in both sides of the merge
                                // if it has normalizations in both, we combine their normalizations
                                // if it has a normalization in one and not in the other, that means
                                // in one side of the merge it was in there as itself, so we need to preserve
                                // that by adding it to the merged normalization list
                                const norm1Vals = norm1.get(sourceKeys[0]);
                                const norm2Vals = norm2.get(sourceKeys[1]);

                                const combined = new Set([
                                    ...(norm1Vals || []).map((target) => { return norm1ToMerged.get(target); }),
                                    ...(norm2Vals || []).map((target) => { return norm2ToMerged.get(target); })
                                ]);
                                if (!norm1Vals || !norm2Vals) combined.add(mergedKey);

                                mergedVals = Array.from(combined).sort();
                            } else {
                                mergedVals = normalization[1].map((target) => { return normToMerged.get(target); });
                            }
                            return [
                                mergedKey,
                                mergedVals
                            ];
                        }, normMap)
                    ));
                });

                to._dictcache.normalizationCache = normCache;
            }

            cb(err);
        });
    });

    q.awaitAll((err) => {
        if (err) return callback(err);
        to.stopWriting((err) => {
            if (err) return callback(err);
            return callback(null, stats);
        });
    });
}

function getOutputConf(filename, options, callback) {
    const Carmen = require('../index.js');

    const tmp = Carmen.auto(filename, () => {
        const outputConf = {
            to: tmp
        };

        const outputConfig = extend({}, options);
        delete outputConfig.output;
        outputConf.to.startWriting(writeMeta);

        function writeMeta(err) {
            if (err) throw err;
            outputConf.to.putInfo(outputConfig, stopWriting);
        }

        function stopWriting(err) {
            if (err) throw err;
            outputConf.to.stopWriting(() => {
                callback(outputConf);
            });
        }
    });
    return tmp;
}

function multimerge(fromFiles, toFile, options, callback) {
    const toMerge = [];
    let inProgress = 0;
    fromFiles.forEach((fromFile) => { toMerge.push(fromFile); });

    const tmpDir = '/tmp/mrg.' + _randomChars(9);
    let tmpCounter = 0;
    if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir);
    }

    const q = queue(4);
    const queueJobs = function() {
        while (toMerge.length >= 2) {
            const from1File = toMerge.shift(),
                from2File = toMerge.shift();
            inProgress += 2; // eslint-disable-line no-const-assign

            const enqueueTask = function(from1File, from2File, mergeToFile, isFinal) {
                q.defer((from1File, from2File, mergeToFile, cb) => {
                    const worker = fork(__dirname + '/merge-worker.js');
                    worker.send({ from1File: from1File, from2File: from2File, mergeToFile: mergeToFile, options: options });
                    worker.on('exit', (code) => {
                        if (code === 0) {
                            inProgress -= 2; // eslint-disable-line no-const-assign

                            if (isFinal) {
                                // we're done
                                // clean up intermediate products

                                fs.readdir(tmpDir, (err, files) => {
                                    const deleteQ = queue();
                                    for (let i = 0; i < files.length; i++) deleteQ.defer((file, cb) => {
                                        fs.unlink(tmpDir + '/' + file, cb);
                                    }, files[i]);
                                    deleteQ.awaitAll(() => {
                                        fs.rmdir(tmpDir, () => {
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
            };

            if (inProgress === 2 && toMerge.length === 0) {
                // nobody else is working on anything and we've grabbed the last
                // two things to merge, so merge into the final output
                enqueueTask(from1File, from2File, toFile, true);
            } else {
                // we need a temporary thing to merge into
                // (wrap in an iffe to preserve the current from1 and from2)
                (function(from1File, from2File) {
                    const filename = tmpDir + '/merge-' + ('0000' + tmpCounter).substr(-4,4) + '.mbtiles';
                    tmpCounter += 1; // eslint-disable-line no-const-assign
                    enqueueTask(from1File, from2File, filename, false);
                })(from1File, from2File);
            }

        }
    };
    queueJobs();
}
