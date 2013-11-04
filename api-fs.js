var _ = require('underscore'),
    iconv = new require('iconv').Iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE'),
    crypto = require('crypto'),
    fs = require('fs');

module.exports = FSAPI;

function FSAPI(uri, callback) {
    return Parent.call(this, uri, function(err, source) {
        source.emit('open', err);
        callback(err, source);
    });
}

// Implements carmen#getFeature method.
FSAPI.prototype.getFeature = function(id, callback) {
    fs.readFile(id, load);
    function load(err, res) {
        try {
            return callback(null, JSON.parse(res));
        } catch(e) {
            return callback(err || e);
        }
    }
};

// Implements carmen#putFeature method.
FSAPI.prototype.putFeature = function(id, data, callback) {
    fs.writeFile(id, data, load);
    function load(err, res) {
        return callback(err);
    }
};

// Implements carmen#getCarmen method.
FSAPI.prototype.getCarmen = function(type, shard, callback) {
    return this._db.get('SELECT data FROM carmen2 WHERE type = ? AND shard = ?', type, shard, function(err, row) {
        callback(err, row ? row.data : null);
    });
};

// Implements carmen#putCarmen method.
FSAPI.prototype.putCarmen = function(type, shard, data, callback) {
    this.write('carmen2', type + '.' + shard, { type:type, shard: shard, data: data }, callback);
};

// Implements carmen#indexable method.
FSAPI.prototype.indexable = function(pointer, callback) {
    callback(null);
};

// Adds carmen schema to startWriting.
FSAPI.prototype.startWriting = function(callback) {
    return callback(null);
};
