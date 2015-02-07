var fs = require('fs');
var util = require('util');
var Carmen = require('..');
var tilelive = require('tilelive');
var context = require('../lib/context');
var UPDATE = process.env.UPDATE;
var test = require('tape');
var zlib = require('zlib');
var path = require('path');
var mapnik = require('mapnik');
var mem = require('../lib/api-mem');
var feature = require('../lib/util/feature');
var index = require('../lib/index');

mapnik.register_datasource(path.join(mapnik.settings.paths.input_plugins,'ogr.input'));

// limit_verify 1 implies that the correct result must be the very top
// result prior to context verification. It means even with a long list
// of competing results the correct candidate is sorted to the top.

// limit_verify 2 implies that there is some ambiguity prior to context
// verification (e.g. new york (city) vs new york (province)) that is sorted
// into the correct order after context verification occurs.

(function() {
    var conf = { address: new mem({geocoder_address: 1, maxzoom: 14, format: 'pbf'}, function() {}) };
    var c = new Carmen(conf);
    test('Index Cluster', function(t) {
        var vtile = new mapnik.VectorTile(14,3640,5670);
        var address = {
            _id:1,
            _geometry: {
                    type: "LineString",
                    coordinates: [[ -100.00605583190918,48.36314970496242],[-100.00185012817383,48.36640011246755]]
                },
            _text:'fake street',
            _center: [-100.00605583190918,48.36314970496242],
            _cluster: {
                9: { type: "Point", coordinates: [-100.00605583190918,48.36314970496242] },
                10: { type: "Point", coordinates: [-100.00185012817383,48.36640011246755] }
            }
        };
        vtile.addGeoJSON(JSON.stringify(address._geometry), "address");
        zlib.gzip(vtile.getData(), function(err, buffer) {
            t.ifError(err, 'vtile gzip success');
            conf.address.putTile(14,3640,5670, buffer, function() {
                index.update(conf.address, [address], 14, t.end);
            });
        });
    });
    test('contextVector reverse Cluster', function (t) {
        c.geocode('-100.00185012817383,48.36640011246755', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEquals(res, { features: [ { address: '10', center: [ -100.00185012817383, 48.36640011246755 ], geometry: { coordinates: [ -100.00185012817383, 48.36640011246755 ], type: 'Point' }, id: 'address.1', place_name: '10 fake street', properties: {}, relevance: 1, text: 'fake street', type: 'Feature' } ], query: [ -100.00185012817383, 48.36640011246755 ], type: 'FeatureCollection' }, 'Outputs address pt');
            t.end();
        });
    });
    test('index teardown', function(t){
        index.teardown();
        t.end();
    })
})();

(function() {
    var conf = { postcode: new mem({maxzoom: 1, format: 'pbf'}, function() {}) };
    var c = new Carmen(conf);
    test('Index Poly & Point', function(t) {
        var vtile = new mapnik.VectorTile(1,0,0);
        var postcodePoly = {
            _id:1,
            _geometry: {
                type: "Polygon",
                coordinates: [[[-134.296875,44.08758502824516],[-134.296875,70.37785394109224],[-59.765625,70.37785394109224],[-59.765625,44.08758502824516],[-134.296875,44.08758502824516]]]
            },
            _center: [-97.03125, 57.2327194846687],
            _text:'fake polygon'
        };
        var postcodePoint = {
            _id: 2,
            _geometry: {
                type: "Point",
                coordinates: [-99.492,58.263]
            },
            _center: [-99.492,58.263],
            _text: "fake point"
        }
        vtile.addGeoJSON(JSON.stringify(postcodePoly._geometry), "address");
        vtile.addGeoJSON(JSON.stringify(postcodePoint._geometry), "address");
        zlib.gzip(vtile.getData(), function(err, buffer) {
            t.ifError(err, 'vtile gzip success');
            conf.postcode.putTile(1,0,0, buffer, function() {
                index.update(conf.postcode, [postcodePoint], 1, function() {
                    index.update(conf.postcode, [postcodePoly], 1, t.end);
                });
            });
        });
    });

    test('Ensure allFeatures', function(t) {
        feature.getAllFeatures(conf.postcode, function(err, feats) {
            t.ifError(err, 'no feature err');
            t.equals(feats.length, 2);
            t.end();
        })
    })

    test('contextVector reverse polygon', function (t) {
        c.geocode('-125.5078125,64.47279382008166', { limit_verify:1 }, function(err, res) {
            t.ifError(err, 'no geocode err');
            t.equal(res.features[0].text, 'fake polygon', 'returns polygon');
            t.end();
        });
    });
    test('contextVector reverse exact point - return polygon', function (t) {
        c.geocode('-99.492,58.263', { limit_verify:1 }, function(err, res) {
            t.ifError(err, 'no geocode err');
            t.equal(res.features[0].text, 'fake polygon', 'returns polygon');
            t.end();
        });
    });
    test('index teardown', function(t){
        index.teardown();
        t.end();
    })
})();

//If the layer does not have geocoder_address do not take house number into account
(function() {
    var conf = { address: new mem({maxzoom: 1}, function() {}) };
    var c = new Carmen(conf);
    var vtile = new mapnik.VectorTile(1,0,0);
    test('index address', function(t) {
        var address = {
            _id:1,
            _text:'fake street',
            _center:[-97.031, 57.232],
            _geometry: {
                type: "Point",
                coordinates: [-97.031, 57.232]
              }
        };
        vtile.addGeoJSON(JSON.stringify(address._geometry), "address");
        zlib.gzip(vtile.getData(), function(err, buffer) {
            t.ifError(err, 'vtile gzip success');
            conf.address.putTile(1,0,0, buffer, function() {
                index.update(conf.address, [address], 1, function() {
                    index.update(conf.address, [address], 1, t.end);
                });
            });
        });
    });
    test('test address without geocoder_address', function(t) {
        c.geocode('9 fake street', { limit_verify: 1 }, function (err, res) {
            t.ifError(err);
            t.equals(res.features[0].relevance, 0.6666666666666666);
            t.end();
        });
    });
    test('index teardown', function(t){
        index.teardown();
        t.end();
    })
})();
