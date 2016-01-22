var queue = require('queue-async');
var index = require('../../lib/index');
var mapnik = require('mapnik');
var path = require('path');
var zlib = require('zlib');
var cover = require('tile-cover');
var tilebelt = require('tilebelt');
var split = require('split');

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

function zxyArray(input) {
    return input.properties['carmen:zxy'].map(function(zxy) {
        zxy = zxy.split('/');
        zxy[0] = parseInt(zxy[0],10);
        zxy[1] = parseInt(zxy[1],10);
        zxy[2] = parseInt(zxy[2],10);
        return zxy
    });
}

function _addFeature(source, input, vtile_only, callback) {
    input.type = 'Feature';

    if (!input.properties['carmen:zxy']) {
        input.properties['carmen:zxy'] = cover.tiles(input.geometry, {min_zoom: source.maxzoom, max_zoom: source.maxzoom}).map(function(zxy) {
            return zxy[2] + '/' + zxy[0] + '/' + zxy[1]
        });

        var zxys = zxyArray(input);
    } else if (!input.geometry) {
        var zxys = zxyArray(input);

        var i = zxys.length;
        var zxyCoords = [];
        while (i--) {
            zxyCoords[i] = tilebelt.tileToGeoJSON([zxys[i][1], zxys[i][2], zxys[i][0]]).coordinates;
        }

        input.geometry = {
            type: "MultiPolygon",
            coordinates: zxyCoords
        }
    } else {
        var zxys = zxyArray(input);
    }

    input.geometry = input.geometry || {
        type: 'Point',
        coordinates: input.properties['carmen:center']
    };

    if (options.tokens) {
        var tokens = Object.keys(options.tokens);
        for (tokens_it = 0; tokens_it < tokens.length; tokens_it++) {
            source.geocoder_tokens[tokens[tokens_it]] = options.tokens[tokens[tokens_it]];
        }
    }

    var output = split();
    var transformQ = new queue(1);
    var startQ = false;
    output.on('data', function(res) {
        transformQ.defer(vectorize, JSON.parse(res));
    });
    output.on('end', function() {
        if (!startQ) startQ = true;
        else transformQ.awaitAll(end)
    });
    output.on('error', function(err) {
        return callback(err);
    });

    index.update(source, [input], {
        zoom: zxys[0][0],
        output: output
    }, function(err) {
        if (err) return callback(err);
        if (vtile_only) return callback();

        index.store(source, function(err) {
            if (err) return callback(err);

            if (!startQ) startQ = true;
            else transformQ.awaitAll(end)
        });
    });

    function end() {
        callback();
    }

    function vectorize(inputTransform, done) {
        var q = new queue();
        for (var i = 0; i < zxys.length; i++) q.defer(function(zxy, done) {
            source.getTile(zxy[0],zxy[1],zxy[2], function(err, res) {
                if (err) {
                    addData();
                } else {
                    zlib.gunzip(res, function(err, vtileData) {
                        var tmpTile = new mapnik.VectorTile(zxy[0],zxy[1],zxy[2]);
                        tmpTile.addData(vtileData, 'data');
                        addData(tmpTile);
                    });
                }
            });

            function addData(currentTile) {
                if (currentTile) {
                    var feats = JSON.parse(currentTile.toGeoJSONSync('data')).features;
                    feats.push(input);
                } else {
                    feats = [input]
                }

                var vtile = new mapnik.VectorTile(zxy[0],zxy[1],zxy[2]);
                vtile.addGeoJSON(JSON.stringify({
                    type: 'FeatureCollection',
                    features: feats
                }, null, 2), 'data');
                zlib.gzip(vtile.getData(), function(err, buffer) {
                    if (err) return done(err);
                    source.putTile(zxy[0],zxy[1],zxy[2], buffer, function(err) {
                        if (err) return done(err);
                        done();
                    });
                });
            }
        }, zxys[i]);

        q.awaitAll(function(err) {
            if (err) return callback(err);
            return done();
        });
    }
};

