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
var queue = require('queue-async');

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
        addFeature(conf, [14,3640,5670], [{
            properties: {
                _id:1,
                _text:'fake street',
                _center: [-100.00605583190918,48.36314970496242],
                _cluster: {
                    9: { type: "Point", coordinates: [-100.00605583190918,48.36314970496242] },
                    10: { type: "Point", coordinates: [-100.00185012817383,48.36640011246755] }
                }
            },
            geometry: {
                type: "LineString",
                coordinates: [[ -100.00605583190918,48.36314970496242],[-100.00185012817383,48.36640011246755]]
            }
        }], "address", t);
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
    });
})();

(function() {
    var conf = { postcode: new mem({maxzoom: 1, format: 'pbf'}, function() {}) };
    var c = new Carmen(conf);

    test('Index Poly & Point', function(t) {
        addFeature(conf, [1,0,0], [{
            properties: {
                _id:1,
                _center: [-97.03125, 57.2327194846687],
                _text:'fake polygon'
            },
            geometry: {
                type: "Polygon",
                coordinates: [[[-134.296875,44.08758502824516],[-134.296875,70.37785394109224],[-59.765625,70.37785394109224],[-59.765625,44.08758502824516],[-134.296875,44.08758502824516]]]
            }
        },{
            properties: {
                _id: 2,
                _center: [-99.492,58.263],
                _text: "fake point"
            },
            geometry: {
                type: "Point",
                coordinates: [-99.492,58.263]
            }
        }], "postcode", t);
    });

    test('Ensure allFeatures', function(t) {
        feature.getAllFeatures(conf.postcode, function(err, feats) {
            t.ifError(err, 'no feature err');
            t.equals(feats.length, 2);
            t.end();
        });
    });

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
    });
})();

//If the layer does not have geocoder_address do not take house number into account
(function() {
    var conf = { address: new mem({maxzoom: 1, format: 'pbf'}, function() {}) };
    var c = new Carmen(conf);

    test('index address', function(t) {
        addFeature(conf, [1,0,0], [{
            properties: {
                _id:1,
                _text:'fake street',
                _center:[-97.031, 57.232],
            },
            geometry: {
                type: "Point",
                coordinates: [-97.031, 57.232]
            }
        }], "address", t);
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
    });
})();

(function() {
    var conf = { address: new mem({maxzoom: 1, geocoder_address: 1, format: 'pbf'}, function() {}) };
    var c = new Carmen(conf);

    test('index address', function(t) {
        addFeature(conf, [1,0,0], [{
            properties: {
                _id: 1,
                _text:'beach street',
                _center:[-133.59375,58.07787626787517],
                _rangetype:'tiger',
                _lfromhn: '23-100',
                _ltohn: '23-500'
            },
            geometry: {
                type: "LineString",
                coordinates: [[-133.59375,58.07787626787517],[-79.453125,68.91100484562020]]
            }
        }], "address", t);
    });

    test('test hyphenated address query with address range', function(t) {
        c.geocode('23-414 beach street', { limit_verify: 1 }, function (err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, '23-414 beach street', 'found 23-414 beach street');
            t.equals(res.features[0].relevance, 1);
            t.end();
        });
    });

    test('index teardown', function(t){
        index.teardown();
        t.end();
    });
})();

// spatialmatch test to ensure the highest relev for a stacked zxy cell
// is used, disallowing a lower scoring cell from overwriting a previous
// entry.
(function() {
    var conf = {
        place: new mem({maxzoom: 1, format: 'pbf'}, function() {}),
        address: new mem({maxzoom: 1, geocoder_address: 1, format: 'pbf'}, function() {})
    };
    var c = new Carmen(conf);

    test('index place', function(t) {
        addFeature(conf, [1,0,0], [{
            properties: {
                _id:1,
                _text:'fakecity',
                _center:[-110.039,59.712],
            },
            geometry: {
                type:"Polygon",
                coordinates:[[[-124.8046875,53.12040528310657],[-124.8046875,66.23145747862573],[-96.6796875,66.23145747862573],[-96.6796875,53.12040528310657],[-124.8046875,53.12040528310657]]]
            }
        }], "place", t);
    });

    test('index matching address', function(t) {
        addFeature(conf, [1,0,0], [{
            properties: {
                _id: 2,
                _text:'fake street',
                _center:[-110.039,59.712],
                _cluster: {
                    '1': { type: "Point", coordinates: [-110.039,59.712] }
                }
            },
            geometry: {
                type: "Point",
                coordinates: [-110.039,59.712]
            },
        }, {
            properties: {
                _id: 3,
                _text:'fake street',
                _center: [-110.039,59.712],
                _cluster: {
                    '2': { type: "Point", coordinates: [-110.039,59.712] }
                }
            },
            geometry: {
                type: "Point",
                coordinates: [-110.039,59.712]
            }
        }], "address", t);
    });

    test('test spatialmatch relev', function(t) {
        c.geocode('1 fake street fakecity', { limit_verify: 2 }, function (err, res) {
            t.ifError(err);
            t.equals(res.features.length, 1);
            t.equals(res.features[0].relevance, 1);
            t.equals(res.features[0].id, 'address.2');
            t.end();
        });
    });

    test('index teardown', function(t){
        index.teardown();
        t.end();
    });
})();

(function() {
    var conf = { address: new mem({maxzoom: 1, geocoder_address: 1}, function() {}) };
    var c = new Carmen(conf);

    test('index address', function(t) {
        addFeature(conf, [1,0,0], [{
            properties: {
                _id:1,
                _text:'fake street',
                _center:[-123.3984375,57.89149735271031],
                _rangetype:'tiger',
                _lfromhn: '0',
                _ltohn: '100'
            },
            geometry: {
                type:'LineString',
                coordinates:[[-123.3984375,57.89149735271031],[-98.7890625,60.413852350464914]]
            }
        }], "address", t);
    });
    test('test alphanumeric address query with address range', function(t) {
        c.geocode('9b fake street', { limit_verify: 1 }, function (err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, '9b fake street', 'found 9b fake street');
            t.equals(res.features[0].relevance, 1);
            t.end();
        });
    });

    test('index teardown', function(t){
        index.teardown();
        t.end();
    });
})();

(function() {
    var conf = { address: new mem({maxzoom: 6, geocoder_address: 1}, function() {}) };
    var c = new Carmen(conf);

    test('tiger, between the lines', function(t) {
        addFeature(conf, [1,0,0], [{
            properties: {
                _id:1,
                _text:'fake street',
                _zxy:['6/32/32'],
                _center:[0,0],
                _rangetype:'tiger',
                _lfromhn: ['0','104'],
                _ltohn: ['100','200'],
            },
            geometry: {
                type: 'MultiLineString',
                coordinates: [[[-132.5390625,62.2679226294176],[-119.88281249999999,62.2679226294176]],[[-114.2578125,61.938950426660604],[-105.46875,59.712097173322924]]]
            }
        }], "address", t);
    });

    test('test tiger interpolation house number', function(t) {
        c.geocode('102 fake street', { limit_verify: 1 }, function (err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, '102 fake street', 'found 102 fake street');
            t.equals(res.features[0].relevance, 1);
            t.end();
        });
    });

    test('index teardown', function(t){
        index.teardown();
        t.end();
    });
})();

function addFeature(conf, zxy, features, layer, t) {
    var vtile = new mapnik.VectorTile(zxy[0],zxy[1],zxy[2]);
    features.forEach(function(feature) {
        feature = JSON.parse(JSON.stringify(feature));
        feature.geometry.properties = feature.properties;
        vtile.addGeoJSON(JSON.stringify(feature.geometry), layer);
    });

    zlib.gzip(vtile.getData(), function(err, buffer) {
        t.ifError(err, 'vtile gzip success');
        conf[layer].putTile(zxy[0],zxy[1],zxy[2], buffer, function() {
            q = new queue(1);
            features.forEach(function(feature) {
                feature.properties._geometry = feature.geometry;
                q.defer(index.update, conf[layer], [feature.properties], zxy[0]);
            });
            q.awaitAll(function(err, res) {
                t.ifError(err);
                t.end();
            });
        });
    });
}
