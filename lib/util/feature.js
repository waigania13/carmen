var _ = require('underscore');
var queue = require('queue-async');

module.exports = {};
module.exports.getFeature = getFeature;
module.exports.putFeature = putFeature;
module.exports.putFeatures = putFeatures;

function getFeature(source, id, callback) {
    var s = shard(source._geocoder.shardlevel, id);
    source.getGeocoderData('feature', s, function(err, buffer) {
        if (err) return callback(err);
        try {
            var data = buffer ? JSON.parse(buffer) : {};
            return callback(null, data[id] && JSON.parse(data[id]));
        } catch (err) { return callback(err); }
    });
}

function putFeature(source, id, data, callback) {
    var s = shard(source._geocoder.shardlevel, id);
    source.getGeocoderData('feature', s, function(err, buffer) {
        if (err) return callback(err);
        try {
            var current = buffer ? JSON.parse(buffer) : {};
            if (current[id]) {
                current[id] = JSON.stringify(_(JSON.parse(current[id])).extend(data));
            } else {
                current[id] = JSON.stringify(data);
            }
            source.putGeocoderData('feature', JSON.stringify(current), callback);
        } catch (err) { return callback(err); }
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
                var current = buffer ? JSON.parse(buffer) : {};
                for (var i = 0; i < docs.length; i++) {
                    var doc = docs[i];
                    var entry = current[doc._hash] ? JSON.parse(current[doc._hash]) : {};
                    entry[doc._id] = doc;
                    current[doc._hash] = JSON.stringify(entry, cleanDoc);
                }
                source.putGeocoderData('feature', s, JSON.stringify(current), callback);
            } catch (err) { return callback(err) }
        });
    }, s, byshard[s]);
    q.awaitAll(callback);
}

// Strip temporary indexing attributes from feature docs.
function cleanDoc(key, val) {
    if (key === '_hash') return;
    if (key === '_grid') return;
    if (key === '_phrases') return;
    if (key === '_termsets') return;
    if (key === '_termsmaps') return;
    return val;
}

// Return unique elements of ids.
function uniq(ids) {
    var uniq = [];
    var last;
    ids.sort();
    for (var i = 0; i < ids.length; i++) {
        if (ids[i] !== last) {
            last = ids[i];
            uniq.push(ids[i]);
        }
    }
    return uniq;
}

// Return the shard for a given shardlevel + id.
function shard(level, id) {
    if (id === undefined) return false;
    var mod = Math.pow(16,level+1);
    return Math.floor((id%(64*mod))/64);
}

