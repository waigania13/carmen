var queue = require('queue-async');
var termops = require('./termops');
var tilebelt = require('tilebelt');

module.exports = {};
module.exports.transform = transform;
module.exports.seek = seek;
module.exports.shard = shard;
module.exports.getFeatureByCover = getFeatureByCover;
module.exports.getFeatureById = getFeatureById;
module.exports.putFeatures = putFeatures;

//Old syle documents use a flat heiarchy - transform them into geojson
function transform(feat) {
    var doc = {
        id: feat._id,
        type: "Feature",
        properties: {
            "carmen:text": feat._text,
            "carmen:center": feat._center,
            "carmen:score": feat._score,
            "carmen:rangetype": feat._rangetype,
            "carmen:lfromhn": feat._lfromhn,
            "carmen:ltohn": feat._ltohn,
            "carmen:rfromhn": feat._rfromhn,
            "carmen:rtohn": feat._rtohn,
            "carmen:parityl": feat._parityl,
            "carmen:parityr": feat._parityr
        }
    }

   if (feat._cluster) {
        doc.geometry = {
            type: "MultiPoint",
            coordinates: []
        }

        doc.properties["carmen:addressnumber"] = Object.keys(feat._cluster).map(function(address) {
            doc.geometry.coordinates.push(feat._cluster[address]);
            return address;
        });
    }

    if (feat._zxy) {
        var zxys = feat._zxy.map(function(zxy) {
            zxy = zxy.split('/');
            zxy[0] = parseInt(zxy[0],10);
            zxy[1] = parseInt(zxy[1],10);
            zxy[2] = parseInt(zxy[2],10);
            return zxy
        });

        doc.geometry = {
            type: "MultiPolygon",
            coordinates: zxys.map(function(zxy) {
                return tilebelt.tileToGeoJSON([zxy[1], zxy[2], zxy[0]]).geometry.coordinates;
            })
        }
   } else if (!doc.geometry && feat._geometry) {
        doc.geometry = feat._geometry;
   } else {
        throw new Error('Could not infer geometry');
   }
 
}

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
        if (!buffer || !buffer.length) return callback();

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
        if (!loaded) {
            console.warn('[warning] Feature not found: %s.%d', source._geocoder.name, cover.id);
            return callback();
        }

        var zxy = source._geocoder.zoom + '/' + cover.x + '/' + cover.y;
        var feature;
        for (var id in loaded) {
            if (loaded[id]._zxy.indexOf(zxy) === -1) continue;
            feature = loaded[id];
            break;
        }

        if (!feature) {
            console.warn('[warning] Feature not found: %s.%d', source._geocoder.name, cover.id);
            return callback();
        }

        //Convert old style features to new
        if (feature._text) { feature = transform(feature); }

        return callback(null, feature);
    });
}

function getFeatureById(source, id, callback) {
    if (source._geocoder.version === 0)
        return getFeatureByLegacyId(source, id, callback);

    getHash(source, termops.feature(id), function(err, loaded) {
        if (err) return callback(err);
        if (!loaded) {
            console.warn('[warning] Feature not found: %s.%d', source._geocoder.name, id);
            return callback();
        }

        var feature = loaded && loaded[id];
        if (!feature) {
            console.warn('[warning] Feature not found: %s.%d', source._geocoder.name, id);
            return callback();
        }
        if (feature._text) { feature = transform(feature); }
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
        if (!loaded) {
            console.warn('[warning] Feature not found: %s.%d', source._geocoder.name, id);
            return callback();
        }

        var feature = loaded && loaded[id];
        if (!feature) {
            console.warn('[warning] Feature not found: %s.%d', source._geocoder.name, id);
            return callback();
        }
        if (feature._text) { feature = transform(feature); }
        return callback(null, feature);
    });
}

function putFeatures(source, docs, callback) {
    var byshard = {};
    for (var i = 0; i < docs.length; i++) {
        var doc = docs[i];
        var s = termops.feature(doc.id);
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
                current[doc.id] = doc;
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
