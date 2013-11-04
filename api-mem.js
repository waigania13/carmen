module.exports = MemSource;

function MemSource(uri, callback) {
    this._features = {};
    this._shards = {};
    source.emit('open', err);
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
    if (this._shards[type] == undefined) this._shards[type] = {};
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
