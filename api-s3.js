var _ = require('underscore');
var S3 = require('tilelive-s3');
var url = require('url');
var path = require('path');
var iconv = new require('iconv').Iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE');

// The S3 datasource is an expanded version of the `tilelive-s3` type
module.exports = S3;

// Implements carmen#getFeature method.
S3.prototype.getFeature = function(id, callback, raw) {
    if (!this.data) return callback(new Error('Tilesource not loaded'));

    // Parse carmen URL.
    try {
        var uri = url.parse(this.data._geocoder);
        uri.pathname = path.join(uri.pathname, 'data/' + id + '.json');
        this.get(url.format(uri), function(err, buffer) {
            if (err) return callback(err);
            var data;
            try { data = JSON.parse(buffer.toString('utf8')); }
            catch (err) { return callback(err); }
            if (!raw) delete data._terms;
            return callback(null, data);
        });
    } catch (err) {
        return callback(new Error('Carmen not supported'));
    }
};

// Implements carmen#putFeature method.
S3.prototype.putFeature = function(id, data, callback) {
    if (!this.data) return callback(new Error('Tilesource not loaded'));

    // Parse carmen URL.
    try {
        var uri = url.parse(this.data._geocoder);
        var key = path.join(uri.pathname, 'data/' + id + '.json');
        var buffer = new Buffer(JSON.stringify(data));
        var headers = {
            'x-amz-acl': 'public-read',
            'Connection': 'keep-alive',
            'Content-Length': buffer.length,
            'Content-Type': 'application/json'
        };
        this.put(key, buffer, headers, callback);
    } catch (err) {
        return callback(new Error('Carmen not supported'));
    }
};

// Implements carmen#getCarmen method.
S3.prototype.getCarmen = function(type, shard, callback) {
    if (!this.data) return callback(new Error('Tilesource not loaded'));

    // Parse carmen URL.
    try {
        var uri = url.parse(this.data._geocoder);
        uri.pathname = path.join(uri.pathname, type + '/' + shard + '.pbf');
        this.get(url.format(uri), function(err, buffer) {
            callback(err && err.status > 499 ? err : null, buffer);
        });
    } catch (err) {
        return callback(new Error('Carmen not supported'));
    }
};

// Implements carmen#putCarmen method.
S3.prototype.putCarmen = function(type, shard, data, callback) {
    if (!this.data) return callback(new Error('Tilesource not loaded'));

    // Parse carmen URL.
    try {
        var uri = url.parse(this.data._geocoder),
            key = path.join(uri.pathname, type + '/' + shard + '.pbf'),
            headers = {
                'x-amz-acl': 'public-read',
                'Connection': 'keep-alive',
                'Content-Length': data.length,
                'Content-Type': 'application/x-protobuf'
            };
        this.put(key, data, headers, callback);
    } catch (err) {
        return callback(new Error('Carmen not supported'));
    }
};

// @TODO.
// Implements carmen#indexable method.
S3.prototype.indexable = function(pointer, callback) {
    if (!this.data) return callback(new Error('Tilesource not loaded'));

    // Parse carmen URL.
    var uri;
    try { uri = url.parse(this.data._geocoder); }
    catch (err) { return callback(new Error('Carmen not supported')); }

    pointer = pointer || {};
    pointer.done = pointer.done || false;
    pointer.limit = pointer.limit || 1000;
    pointer.marker = pointer.marker || null;

    // Pointer true means all docs have been read.
    if (pointer.done) return callback(null, [], pointer);

    new S3.get({
        uri: url.format({
            hostname: uri.hostname,
            protocol: uri.protocol,
            query:{
                marker: pointer.marker,
                prefix: path.join(uri.pathname, 'data').substr(1),
                'max-keys':pointer.limit
            }
        }),
        headers: {Connection:'Keep-Alive'},
        agent: S3.agent
    }).asBuffer(function(err, buffer) {
        if (err) return callback(err);
        var xml = buffer.toString('utf8');
        var parsed = xml.match(new RegExp('[^>]+(?=<\\/Key>)', 'g')) || [];
        var truncated = /true<\/IsTruncated>/ig.test(xml);
        if (truncated) {
            pointer.marker = parsed[parsed.length-1];
        } else {
            pointer.done = true;
        }

        // No more results.
        if (!parsed.length) return callback(null, [], pointer);

        var docs = [];
        var next = function() {
            if (!parsed.length) return callback(null, docs, pointer);
            var key = parsed[0];
            new S3.get({
                uri: url.format({
                    hostname:uri.hostname,
                    protocol:uri.protocol,
                    pathname:key
                }),
                headers: {Connection:'Keep-Alive'},
                agent: S3.agent
            }).asBuffer(function(err, buffer) {
                if (err) return callback(err);

                var data;
                try { data = JSON.parse(buffer.toString('utf8')); }
                catch(err) { return callback(err); }

                var zxy = data._terms && data._terms.length &&
                    data._terms[0].split('/').pop().split('.').slice(2)
                    .map(function(zxy) { return zxy.replace(/,/g,'/'); });
                var doc = {};
                doc.id = path.basename(key, path.extname(key));
                doc.doc = data;
                doc.text = data.search;
                doc.zxy = zxy || [];
                delete data._terms;

                docs.push(doc);
                parsed.shift();
                next();
            });
        };
        next();
    }.bind(this));
};

