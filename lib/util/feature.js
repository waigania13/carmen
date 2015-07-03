var queue = require('queue-async');

module.exports = {};
module.exports.seek = seek;
module.exports.shard = shard;
module.exports.getFeature = getFeature;
module.exports.putFeatures = putFeatures;

// Seek to individual entry in JSON shard without doing a JSON.parse()
// against the entire shard. This is a performance optimization.
function seek(buffer, id) {
    buffer = typeof buffer === 'string' ? buffer : buffer.toString();

    var start = buffer.indexOf('"'+id+'":"{');
    if (start === -1) return false;

    start = buffer.indexOf('"{', start);
    var end = buffer.indexOf('}"', start);
    var entry = buffer.slice(start, end+2);

    return JSON.parse(JSON.parse(entry));
}

function getFeature(source, id, callback) {
    var s = shard(source._geocoder.shardlevel, id);
    source._geocoder.fcache = source._geocoder.fcache || {};
    source.getGeocoderData('feature', s, function(err, buffer) {
        if (err) return callback(err);
        var data;
        try {
            data = seek(buffer, id);
        } catch(err) {
            return callback(err);
        }
        return callback(null, data);
    });
}

function putFeatures(source, docs, callback) {
    var byshard = {};
    for (var i = 0; i < docs.length; i++) {
        var doc = docs[i];
        var s = shard(source._geocoder.shardlevel, doc._hash);
        byshard[s] = byshard[s] || [];
        byshard[s].push(doc);
    }
    var q = queue(100);
    for (var s in byshard) q.defer(function(s, docs, callback) {
        source.getGeocoderData('feature', s, function(err, buffer) {
            if (err) return callback(err);
            try {
                var current = buffer && buffer.length ? JSON.parse(buffer) : {};
            } catch (err) {
                return callback(err);
            }
            var hashes = [];
            var hashesUniq = {};
            for (var i = 0; i < docs.length; i++) {
                var doc = docs[i];
                if (typeof current[doc._hash] === 'string') {
                    try {
                        current[doc._hash] = JSON.parse(current[doc._hash]);
                    } catch(err) {
                        return callback(err);
                    }
                } else if (typeof current[doc._hash] === 'undefined') {
                    current[doc._hash] = {};
                }
                if (!hashesUniq[doc._hash]) {
                    hashes.push(doc._hash);
                    hashesUniq[doc._hash] = true;
                }
                current[doc._hash][doc._id] = doc;
                // Strip temporary indexing attributes from feature docs.
                delete doc._hash;
                delete doc._grid;
            }
            for (var i = 0; i < hashes.length; i++) {
                current[hashes[i]] = JSON.stringify(current[hashes[i]]);
            }
            source.putGeocoderData('feature', s, JSON.stringify(current), callback);
        });
    }, s, byshard[s]);
    q.awaitAll(callback);
}

// Return the shard for a given shardlevel + id.
function shard(level, id) {
    if (id === undefined) return false;
    var mod = Math.pow(16,level+1);
    var interval = Math.min(64, Math.pow(16, 4-level));
    return Math.floor((id%(interval*mod))/interval);
}
