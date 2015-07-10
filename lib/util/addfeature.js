var queue = require('queue-async');
var index = require('../../lib/index');
var tilebelt = require('tilebelt');
var mapnik = require('mapnik');
var path = require('path');
var zlib = require('zlib');

mapnik.register_datasource(path.join(mapnik.settings.paths.input_plugins,'ogr.input'));
mapnik.register_datasource(path.join(mapnik.settings.paths.input_plugins,'geojson.input'));

module.exports = addFeature;
module.exports.vt = addVT;

function addFeature(source, doc, callback) {
    return _addFeature(source, doc, false, callback);
}

function addVT(source, doc, callback) {
    return _addFeature(source, doc, true, callback);
}

function _addFeature(source, doc, vtile_only, callback) {
    var zxys = doc._zxy.map(function(zxy) {
        zxy = zxy.split('/');
        zxy[0] = parseInt(zxy[0],10);
        zxy[1] = parseInt(zxy[1],10);
        zxy[2] = parseInt(zxy[2],10);
        return zxy
    });

    var feature = { type:'Feature', properties:doc };
    if (doc._geometry) {
        feature.geometry = doc._geometry;
    } else {
        feature.geometry = {
            type: 'MultiPolygon',
            coordinates: zxys.map(function(zxy) {
                return tilebelt.tileToGeoJSON([zxy[1], zxy[2], zxy[0]]).geometry.coordinates;
            })
        };
    }

    var q = queue();
    for (var i = 0; i < zxys.length; i++) q.defer(function(zxy, done) {
        var vtile = new mapnik.VectorTile(zxy[0],zxy[1],zxy[2]);
        vtile.addGeoJSON(JSON.stringify({
            type: 'FeatureCollection',
            features: [feature]
        }, null, 2), 'data');
        zlib.gzip(vtile.getData(), function(err, buffer) {
            if (err) return done(err);
            source.putTile(zxy[0],zxy[1],zxy[2], buffer, function(err) {
                if (err) return done(err);
                done();
            });
        });
    }, zxys[i]);

    q.awaitAll(function(err) {
        if (err) return callback(err);
        if (vtile_only) return callback();
        index.update(source, [doc], zxys[0][0], callback);
    });
};

