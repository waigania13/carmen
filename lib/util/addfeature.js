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

function _addFeature(source, input, vtile_only, callback) {
    var doc = {
        id: input._id,
        type: "Feature",
        properties: {
            "carmen:text": input._text,
            "carmen:center": input._center,
            "carmen:score": input._score,
            "carmen:rangetype": input._rangetype,
            "carmen:lfromhn": input._lfromhn,
            "carmen:ltohn": input._ltohn,
            "carmen:rfromhn": input._rfromhn,
            "carmen:rtohn": input._rtohn,
            "carmen:parityl": input._parityl,
            "carmen:parityr": input._parityr
        }
    }
  
    if (input._cluster) {
        doc.geometry = {
            type: "MultiPoint",
            coordinates: []
        }

        doc.properties["carmen:addressnumber"] = Object.keys(input._cluster).map(function(address) {
            doc.geometry.coordinates.push(input._cluster[address]);
            return address;
        });
    }
   
    if (input._zxy) {
        var zxys = input._zxy.map(function(zxy) {
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
   } else if (!doc.geometry && input._geometry) {
        doc.geometry = input._geometry;
   } else {
        throw new Error('Could not infer geometry');
   }

    var q = queue();
    for (var i = 0; i < zxys.length; i++) q.defer(function(zxy, done) {
        var vtile = new mapnik.VectorTile(zxy[0],zxy[1],zxy[2]);
        vtile.addGeoJSON(JSON.stringify({
            type: 'FeatureCollection',
            features: [doc]
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
        index.update(source, [doc], zxys[0][0], function(err) {
            if (err) return callback(err);
            index.store(source, callback);
        });
    });
};
