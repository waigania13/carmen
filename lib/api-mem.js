var EventEmitter = require('events').EventEmitter,
    docs = require('../test/fixtures/docs.json'),
    fs = require('fs'),
    inherits = require('util').inherits;

module.exports = MemSource;

inherits(MemSource, EventEmitter);

function MemSource(uri, callback) {
    this._shards = {};
    this.open = true;
    return callback(null, this);
}

// Implements carmen#getGeocoderData method.
MemSource.prototype.getGeocoderData = function(type, shard, callback) {
    return callback(null, this._shards[type] && this._shards[type][shard]);
};

// Implements carmen#putGeocoderData method.
MemSource.prototype.putGeocoderData = function(type, shard, data, callback) {
    if (this._shards[type] === undefined) this._shards[type] = {};
    this._shards[type][shard] = data;
    return callback(null);
};

// Implements carmen#getIndexableDocs method.
MemSource.prototype.getIndexableDocs = function(pointer, callback) {
    pointer = pointer || {};
    if (pointer.done) return callback(null, [], pointer);
    return callback(null, docs, {done:true});
};

// Adds carmen schema to startWriting.
MemSource.prototype.startWriting = function(callback) {
    return callback(null);
};

// Shards are stored as binary buffers, so we need to convert them to base64
// strings in order for them to be safe for JSON.stringify
MemSource.prototype.serialize = function(name, callback) {
    function shardify(shards) {
        var o = {};
        for (var i in shards) {
            o[i] = strings(shards[i]);
        }
        return o;
    }

    function strings(shards) {
        var o = {};
        for (var i in shards) {
            o[i] = shards[i].toString('base64');
        }
        return o;
    }

    return {
        shards: shardify(this._shards),
        geocoder: this._geocoder
    };
};

MemSource.prototype.stopWriting = function(callback) {
    return callback(null);
};

MemSource.prototype.getInfo = function(callback) {
    callback(null, {
        maxzoom: 17
    });
};
