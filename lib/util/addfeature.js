var queue = require('queue-async');
var index = require('../../lib/index');
var mapnik = require('mapnik');
var path = require('path');
var zlib = require('zlib');
var feature = require('./feature');
var cover = require('tile-cover');

mapnik.register_datasource(path.join(mapnik.settings.paths.input_plugins,'ogr.input'));
mapnik.register_datasource(path.join(mapnik.settings.paths.input_plugins,'geojson.input'));

module.exports = addFeature;
module.exports.vt = addVT;

var options = {};

module.exports.setOptions = function(opts) {
    options = opts;
}

function addFeature(source, doc, callback) {
    return _addFeature(source, doc, false, callback);
}

function addVT(source, doc, callback) {
    return _addFeature(source, doc, true, callback);
}

function _addFeature(source, input, vtile_only, callback) {
    if (input._text) {
        input = feature.transform(input);
    }

    input.geometry = input.geometry || {
        type: 'Point',
        coordinates: input.properties['carmen:center']
    };

    if (!input.properties['carmen:zxy']) {
        input.properties['carmen:zxy'] = cover.tiles(input.geometry, {min_zoom: source.maxzoom, max_zoom: source.maxzoom}).map(function(zxy) {
            return zxy[2] + '/' + zxy[0] + '/' + zxy[1]
        });
    }

    var zxys = input.properties['carmen:zxy'].map(function(zxy) {
        zxy = zxy.split('/');
        zxy[0] = parseInt(zxy[0],10);
        zxy[1] = parseInt(zxy[1],10);
        zxy[2] = parseInt(zxy[2],10);
        return zxy
    });

    var q = queue();
    for (var i = 0; i < zxys.length; i++) q.defer(function(zxy, done) {
        var vtile = new mapnik.VectorTile(zxy[0],zxy[1],zxy[2]);
        vtile.addGeoJSON(JSON.stringify({
            type: 'FeatureCollection',
            features: [input]
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
        if (options.tokens) {
            var tokens = Object.keys(options.tokens);
            for (tokens_it = 0; tokens_it < tokens.length; tokens_it++) {
                source.geocoder_tokens[tokens[tokens_it]] = options.tokens[tokens[tokens_it]];
            }
        }
        index.update(source, [input], zxys[0][0], function(err) {
            if (err) return callback(err);
            index.store(source, callback);
        });
    });
};
