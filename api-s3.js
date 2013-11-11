var _ = require('underscore');
var S3 = require('tilelive-s3');
var url = require('url');
var path = require('path');

// The S3 datasource is an expanded version of the `tilelive-s3` type
module.exports = S3;

function prepareURI(uri, id) {
    var prefix = (id%256).toString(16);
    prefix = prefix.length < 2 ? '0' + prefix : prefix;
    uri = url.parse(uri);
    uri.pathname = uri.pathname.replace('{prefix}', prefix);
    return uri;
};

// Implements carmen#getFeature method.
S3.prototype.getFeature = function(id, callback, raw) {
    if (!this.data) return callback(new Error('Tilesource not loaded'));

    // Parse carmen URL.
    try {
        var uri = prepareURI(this.data._geocoder, id);
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
        var uri = prepareURI(this.data._geocoder, id);
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

// Implements carmen#getGeocoderData method.
S3.prototype.getGeocoderData = function(type, shard, callback) {
    if (!this.data) return callback(new Error('Tilesource not loaded'));

    // Parse carmen URL.
    try {
        var uri = prepareURI(this.data._geocoder, shard);
        uri.pathname = path.join(uri.pathname, type + '/' + shard + '.pbf');
        this.get(url.format(uri), function(err, buffer) {
            callback(err && err.status > 499 ? err : null, buffer);
        });
    } catch (err) {
        return callback(new Error('Carmen not supported'));
    }
};

// Implements carmen#putGeocoderData method.
S3.prototype.putGeocoderData = function(type, shard, data, callback) {
    if (!this.data) return callback(new Error('Tilesource not loaded'));

    // Parse carmen URL.
    try {
        var uri = prepareURI(this.data._geocoder, shard),
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
// Implements carmen#getIndexableDocs method.
S3.prototype.getIndexableDocs = function(pointer, callback) {
    if (!this.data) return callback(new Error('Tilesource not loaded'));

    pointer = pointer || {};
    pointer.done = pointer.done || false;
    pointer.limit = pointer.limit || 1000;
    pointer.marker = pointer.marker || null;

    // Parse carmen URL.
    var uri;
    if (/{prefix}/.test(this.data._geocoder)) {
        pointer.prefix = pointer.prefix || 0;
        try { uri = prepareURI(this.data._geocoder, pointer.prefix); }
        catch (err) { return callback(new Error('Carmen not supported')); }
    } else {
        try { uri = url.parse(this.data._geocoder); }
        catch (err) { return callback(new Error('Carmen not supported')); }
    }

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
        } else if ('prefix' in pointer && pointer.prefix < 256) {
            pointer.marker = null;
            pointer.prefix++;
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

