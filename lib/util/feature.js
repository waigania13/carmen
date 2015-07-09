var queue = require('queue-async');
var termops = require('./termops');

module.exports = {};
module.exports.seek = seek;
module.exports.shard = shard;
module.exports.getFeatureByCover = getFeatureByCover;
module.exports.getFeatureById = getFeatureById;
module.exports.putFeatures = putFeatures;

// version: 0
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

function getHash(source, hash, callback) {
    source.getGeocoderData('feature', hash, function(err, buffer) {
        if (err) return callback(err);
        var data;
        try {
            data = JSON.parse(buffer);
        } catch(err) {
            return callback(err);
        }
        callback(null, data);
    });
}

function getFeatureByCover(source, cover, callback) {
    getHash(source, cover.id, function(err, loaded) {
        if (err) return callback(err);
        if (!loaded) return callback(new Error('Feature not found, cover id: ' + cover.id));

        var zxy = source._geocoder.zoom + '/' + cover.x + '/' + cover.y;
        var feature;
        for (var id in loaded) {
            if (loaded[id]._zxy.indexOf(zxy) === -1) continue;
            feature = loaded[id];
            break;
        }

        if (!feature) return callback(new Error('Feature not found, cover id: ' + cover.id));
        return callback(null, feature);
    });
}

function getFeatureById(source, id, callback) {
    if (source._geocoder.version === 0)
        return getFeatureByLegacyId(source, id, callback);

    getHash(source, termops.feature(id), function(err, loaded) {
        if (err) return callback(err);
        if (!loaded) return callback(new Error('Feature not found, id: ' + id));

        var feature = loaded && loaded[id];
        if (!feature) return callback(new Error('Feature not found, id: ' + id));
        return callback(null, feature);
    });
}

function getFeatureByLegacyId(source, id, callback) {
    var hash = termops.feature(id);
    var s = shard(source._geocoder.shardlevel, hash);
    source.getGeocoderData('feature', s, function(err, buffer) {
        if (err) return callback(err);
        var loaded;
        try {
            loaded = seek(buffer, hash);
        } catch(err) {
            return callback(err);
        }
        if (!loaded) return callback(new Error('Feature not found, id: ' + id));

        var feature = loaded && loaded[id];
        if (!feature) return callback(new Error('Feature not found, id: ' + id));
        return callback(null, feature);
    });
}

function putFeatures(source, docs, callback) {
    var byshard = {};
    for (var i = 0; i < docs.length; i++) {
        var doc = docs[i];
        var s = termops.feature(doc._id);
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
            for (var i = 0; i < docs.length; i++) {
                var doc = docs[i];
                current[doc._id] = doc;
                // Strip temporary indexing attributes from feature docs.
                delete doc._hash;
                delete doc._grid;
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
