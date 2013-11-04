var EventEmitter = require('events').EventEmitter,
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

// Implements carmen#getCarmen method.
MemSource.prototype.getCarmen = function(type, shard, callback) {
    return callback(null, this._shards[type] && this._shards[type][shard]);
};

// Implements carmen#putCarmen method.
MemSource.prototype.putCarmen = function(type, shard, data, callback) {
    if (this._shards[type] === undefined) this._shards[type] = {};
    this._shards[type][shard] = data;
    return callback(null);
};

// Implements carmen#indexable method.
MemSource.prototype.indexable = function(pointer, callback) {
    return callback(null);
};

// Adds carmen schema to startWriting.
MemSource.prototype.startWriting = function(callback) {
    return callback(null);
};

MemSource.prototype.dumpFile = function(name, callback) {
    fs.writeFileSync(name, JSON.stringify({
        features: this._features,
        shards: this._shards
    }, null, 4));
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
