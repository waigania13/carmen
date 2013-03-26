var _ = require('underscore');
var S3 = require('tilelive-s3');
var url = require('url');
var path = require('path');
var iconv = new require('iconv').Iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE');

module.exports = S3;

// Converts a doc into an array of search terms.
S3.terms = function(doc) {
    var terms = [];
    doc.split(',').forEach(function(doc) {
        var parts = doc.split(' ')
            .map(function(w) { return w.replace(/[^\w]/g, '').toLowerCase(); })
            .filter(function(w) { return w.length });
        terms = terms
            .concat(parts.filter(function(w) { return w.length > 1 }))
            .concat(parts.length > 1 ? parts.join('_') : []);
    });
    return terms;
};

// Implements carmen#search method.
S3.prototype.search = function(query, id, callback) {
    if (!this.data) return callback(new Error('Tilesource not loaded'));

    // Parse carmen URL.
    try { var uri = url.parse(this.data._carmen); }
    catch (err) { return callback(new Error('Carmen not supported')); }

    new S3.get({
        uri: url.format({
            hostname:uri.hostname,
            protocol:uri.protocol,
            query:{prefix:path.join(uri.pathname, 'term/' + S3.terms(query).pop()).substr(1)}
        }),
        headers: {Connection:'Keep-Alive'},
        agent: S3.agent
    }).asBuffer(function(err, buffer) {
        if (err) return callback(err);
        var xml = buffer.toString('utf8');
        var parsed = xml.match(new RegExp('[^>]+(?=<\\/Key>)', 'g')) || [];
        var docs = _(parsed).chain()
            .reduce(function(memo, obj) {
                var key = obj.split('/').pop().split('.');
                memo[key[1]] = memo[key[1]] || {};
                memo[key[1]].id = key[1];
                memo[key[1]].text = key[0].replace(/_/g,' ');
                memo[key[1]].zxy = (memo[key[1]].zxy || [])
                    .concat(key.slice(2).map(function(v) { return v.replace(/,/g,'/') }));
                return memo;
            }, {})
            .toArray()
            .value();
        return callback(null, docs);
    }.bind(this));
};

// Implements carmen#feature method.
S3.prototype.feature = function(id, callback, raw) {
    if (!this.data) return callback(new Error('Tilesource not loaded'));

    // Parse carmen URL.
    try { var uri = url.parse(this.data._carmen); }
    catch (err) { return callback(new Error('Carmen not supported')); }

    uri.pathname = path.join(uri.pathname, 'data/' + id + '.json');
    new S3.get({
        uri: url.format(uri),
        headers: {Connection:'Keep-Alive'},
        agent: S3.agent
    }).asBuffer(function(err, buffer) {
        if (err) return callback(err);
        try { var data = JSON.parse(buffer.toString('utf8')); }
        catch (err) { return callback(err); }
        if (!raw) delete data._terms;
        return callback(null, data);
    });
};

// Implements carmen#index method.
S3.prototype.index = function(id, text, doc, zxy, callback) {
    if (!this.data) return callback(new Error('Tilesource not loaded'));
    if (!this.client) return callback(new Error('Tilesource not writing'));

    // @TODO get existing document and purge its terms.

    // Parse carmen URL.
    try { var uri = url.parse(this.data._carmen); }
    catch (err) { return callback(new Error('Carmen not supported')); }

    try { text = iconv.convert(text).toString(); }
    catch(err) { return callback(err); }

    // Add each search term shard.
    var terms = [];
    var puts = [];
    S3.terms(text).forEach(function(shard) {
        var coords = zxy.map(function(zxy) { return zxy.replace(/\//g,',') });
        var prefix = path.join(uri.pathname, 'term/' + shard + '.' + id + '.');
        while (coords.length) {
            var chunk = [];
            do {
                var next = prefix + chunk.join('.') + (coords.length ? '.' + coords[0] : '');
            } while (
                next.length < 1024 &&
                coords.length &&
                chunk.push(coords.shift())
            );
            var key = prefix + chunk.join('.');
            terms.push(key);
            puts.push({ key:key, data:'' });
        }
    });

    // Add actual doc to queue.
    puts.push({
        key:path.join(uri.pathname, 'data/' + id + '.json'),
        data:JSON.stringify(_({_terms:terms}).defaults(doc))
     });

    var put = function(err) {
        if (!puts.length) return callback();
        if (err) {
            console.error(err);
            return setTimeout(put, 500);
        }

        var obj = puts[0];
        var req = this.client.put(obj.key, {
            'x-amz-acl': 'public-read',
            'Connection': 'keep-alive',
            'Content-Length': obj.data ? Buffer.byteLength(obj.data, 'utf8') : 0,
            'Content-Type': 'application/json'
        });
        req.on('close', put);
        req.on('error', put);
        req.setTimeout(60e3, function() {
            req.abort();
            var err = new Error('ESOCKETTIMEDOUT');
            err.code = 'ESOCKETTIMEDOUT';
            req.emit('error', err);
        });
        req.on('response', function(res) {
            res.on('error', put);
            if (res.statusCode === 200) {
                puts.shift();
                return put();
            } else {
                console.warn(res);
                return put(new Error('S3 put failed: ' + res.statusCode));
            }
        });
        req.end(obj.data);
    }.bind(this);

    put();
};

// Implements carmen#indexable method.
S3.prototype.indexable = function(pointer, callback) {
    if (!this.data) return callback(new Error('Tilesource not loaded'));

    // Parse carmen URL.
    try { var uri = url.parse(this.data._carmen); }
    catch (err) { return callback(new Error('Carmen not supported')); }

    pointer = pointer || null;

    // Pointer true means all docs have been read.
    if (pointer === true) return callback(null, [], pointer);

    new S3.get({
        uri: url.format({
            hostname:uri.hostname,
            protocol:uri.protocol,
            query:{
                marker: pointer,
                prefix: path.join(uri.pathname, 'data').substr(1),
                'max-keys':1000
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
            pointer = parsed[parsed.length-1];
        } else {
            pointer = true;
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
                // @TODO consider retry here.
                if (err) return callback(err);

                try { var data = JSON.parse(buffer.toString('utf8')); }
                catch(err) { return callback(err); }

                var zxy = data._terms && data._terms.length &&
                    data._terms[0].split('/').pop().split('.').slice(2)
                    .map(function(zxy) { return zxy.replace(/,/g,'/') });
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

