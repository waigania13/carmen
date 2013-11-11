var EventEmitter = require('events').EventEmitter,
    bops = require('bops'),
    fs = require('fs'),
    inherits = require('util').inherits;

module.exports = MemSource;

inherits(MemSource, EventEmitter);

function MemSource(uri, callback) {
    this._features = {};
    this._shards = {};

    return callback(null, this);
}

// Implements carmen#getFeature method.
MemSource.prototype.getFeature = function(id, callback) {
    return callback(null, this._features[id]);
};

// Implements carmen#putFeature method.
MemSource.prototype.putFeature = function(id, data, callback) {
    this._features[id] = data;
    return callback(null);
};

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
    return callback(null);
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
            o[i] = bops.to(shards[i], 'base64');
        }
        return o;
    }

    return {
        features: this._features,
        shards: shardify(this._shards),
        geocoder: this._geocoder
    };
};

MemSource.prototype.open = function(callback) {
    return callback(null);
};

MemSource.prototype.stopWriting = function(callback) {
    return callback(null);
};

MemSource.prototype.getInfo = function(callback) {
    callback(null, {
        maxzoom: 17
    });
};
