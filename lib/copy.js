'use strict';
const queue = require('d3-queue').queue;
const cxxcache = require('./util/cxxcache');
const stream = require('stream');
const fs = require('fs-extra');

module.exports = function index(from, to, callback) {
    to.startWriting((err) => {
        if (err) return callback(err);
        const q = queue(2);
        q.defer(copyType, from, to, 'feature');
        q.awaitAll((err) => {
            if (err) return callback(err);
            to.stopWriting((err) => {
                if (err) return callback(err);
                const copyQ = queue();
                const rocksDirs = {};

                const copyCache = function(type, cb) {
                    // call pack on the from cache into the to filename
                    const toRdb = to.getBaseFilename() + '.' + type + '.rocksdb';

                    from._geocoder[type].pack(toRdb);

                    rocksDirs[type] = toRdb;
                    cb();
                };

                copyQ.defer(copyCache, 'grid');
                copyQ.defer(copyCache, 'freq');
                copyQ.defer((cb) => {
                    const toDawgFile = to.getBaseFilename() + '.dawg';
                    const fromDawgFile = from.getBaseFilename() + '.dawg';

                    if (fs.existsSync(fromDawgFile)) {
                        fs.copy(fromDawgFile, toDawgFile, cb);
                    } else if (from._dictcache.dump) {
                        fs.writeFile(toDawgFile, from._dictcache.dump(), cb);
                    }
                });
                copyQ.await(() => {
                    to._geocoder.grid = new cxxcache.RocksDBCache(to._geocoder.grid.id, rocksDirs.grid);
                    to._geocoder.freq = new cxxcache.RocksDBCache(to._geocoder.freq.id, rocksDirs.freq);
                    callback();
                });
            });
        });
    });
};

function copyType(from, to, type, callback) {
    const getStream = geocoderGetStream(from, type);
    const putStream = geocoderPutStream(to, type);
    getStream.pipe(putStream).pipe(new stream.PassThrough());
    getStream.on('error', done);
    putStream.on('end', done);
    putStream.on('error', done);
    function done(err) {
        callback && callback(err);
        callback = false;
    }
}

function geocoderGetStream(from, type) {
    const readQueue = queue(1);
    const readStream = new stream.Readable({ objectMode:true });
    const iterator = from.geocoderDataIterator(type);
    readStream._read = function() {
        readQueue.defer((callback) => {
            iterator.asyncNext((err, row) => {
                if (err) {
                    readStream.emit('error', err);
                } else if (row.done) {
                    readStream.push(null);
                } else {
                    readStream.push(row.value);
                }
                callback();
            });
        });
    };
    return readStream;
}

function geocoderPutStream(to, type) {
    const putQueue = queue();
    const putStream = new stream.Transform({ objectMode:true });
    putStream.pending = 0;
    putStream._transform = function(row, enc, callback) {
        if (putStream.pending > 1000) {
            return setImmediate(putStream._transform.bind(putStream), row, enc, callback);
        }
        putStream.pending++;
        putQueue.defer((shard, data, callback) => {
            to.putGeocoderData(type, shard, data, (err) => {
                if (err) putStream.emit('error', err);
                putStream.pending--;
                callback(err);
            });
        }, row.shard, row.data);
        callback();
    };
    putStream._flush = function(callback) {
        putQueue.awaitAll(callback);
    };
    return putStream;
}

