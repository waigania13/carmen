var _ = require('underscore');
var S3 = require('tilelive-s3');
var url = require('url');
var path = require('path');
var zlib = require('zlib');

// The S3 datasource is an expanded version of the `tilelive-s3` type
module.exports = S3;

function prepareURI(uri, id) {
    var prefix = (id%256).toString(16);
    prefix = prefix.length < 2 ? '0' + prefix : prefix;
    uri = url.parse(uri);
    uri.pathname = uri.pathname.replace('{prefix}', prefix);
    return uri;
};

// Implements carmen#getGeocoderData method.
S3.prototype.getGeocoderData = function(type, shard, callback) {
    if (!this.data) return callback(new Error('Tilesource not loaded'));

    var extname = type === 'feature' ? '.json' : '.pbf';
    var source = this;

    // Parse carmen URL.
    try {
        var uri = prepareURI(this.data.geocoder_data, shard);
        uri.pathname = path.join(uri.pathname, type + '/' + shard + extname);
        this.get(url.format(uri), function(err, zdata) {
            if (err && err.status > 499) return callback(err);
            zlib.inflate(zdata, function(err, data) {
                if (err) return callback(err);
                callback(null, data);
            })
        });
    } catch (err) {
        return callback(new Error('Carmen not supported'));
    }
};

// Implements carmen#putGeocoderData method.
S3.prototype.putGeocoderData = function(type, shard, data, callback) {
    if (!this.data) return callback(new Error('Tilesource not loaded'));

    var source = this;
    var ctype = 'application/x-protobuf';
    var extname = '.pbf';
    if (type === 'feature') {
        ctype = 'application/json';
        extname = '.json';
    }

    // Parse carmen URL.
    try {
        var uri = prepareURI(this.data.geocoder_data, shard),
            key = path.join(uri.pathname, type + '/' + shard + extname),
            headers = {
                'x-amz-acl': 'public-read',
                'Connection': 'keep-alive',
                'Content-Encoding': 'deflate',
                'Content-Type': ctype
            };
        zlib.deflate(data, function(err, zdata) {
            if (err) return callback(err);
            headers['Content-Length'] = zdata.length;
            source.put(key, zdata, headers, callback);
        });
    } catch (err) {
        return callback(new Error('Carmen not supported'));
    }
};

// @TODO.
// Implements carmen#getIndexableDocs method.
S3.prototype.getIndexableDocs = function(pointer, callback) {
    if (!this.data) return callback(new Error('Tilesource not loaded'));

    pointer = pointer || {};
    pointer.shard = pointer.shard || 0;

    var shardlevel = (this.data.shardlevel || 0) + 1;
    var limit = Math.pow(16, shardlevel);

    // All shards have been read. Done.
    if (pointer.shard >= limit) return callback(null, [], pointer);

    this.getGeocoderData('feature', pointer.shard, function(err, buffer) {
        if (err) return callback(err);
        var data = buffer ? JSON.parse(buffer) : {};
        var docs = [];
        for (var a in data) {
            var features = JSON.parse(data[a]);
            for (var b in features) {
                docs.push(features[b]);
            }
        }
        pointer.shard++;
        callback(null, docs, pointer);
    });
};

