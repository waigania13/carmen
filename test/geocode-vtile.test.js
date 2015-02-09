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
var tilebelt = require('tilebelt');

mapnik.register_datasource(path.join(mapnik.settings.paths.input_plugins,'ogr.input'));

// limit_verify 1 implies that the correct result must be the very top
// result prior to context verification. It means even with a long list
// of competing results the correct candidate is sorted to the top.

// limit_verify 2 implies that there is some ambiguity prior to context
// verification (e.g. new york (city) vs new york (province)) that is sorted
// into the correct order after context verification occurs.

(function() {
    var conf = { address: new mem(null, {geocoder_address: 1, maxzoom: 14}, function() {}) };
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
    var conf = { postcode: new mem(null, {maxzoom: 1}, function() {}) };
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
    var conf = { address: new mem(null, {maxzoom: 1}, function() {}) };
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
    var conf = { address: new mem(null, {maxzoom: 1, geocoder_address: 1}, function() {}) };
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
        place: new mem(null, {maxzoom: 1}, function() {}),
        address: new mem(null, {maxzoom: 1, geocoder_address: 1}, function() {})
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
    var conf = { address: new mem(null, {maxzoom: 1, geocoder_address: 1}, function() {}) };
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
    var conf = { address: new mem(null, {maxzoom: 1, geocoder_address: 1}, function() {}) };
    var c = new Carmen(conf);

    test('tiger, between the lines', function(t) {
        addFeature(conf, [1,0,0], [{
            properties: {
                _id: 1,
                _text:'fake street',
                _center:[-132.5390625,62.2679226294176],
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

(function() {
    var conf = { address: new mem(null, {maxzoom: 1, geocoder_address: 1}, function() {}) };
    var c = new Carmen(conf);

    test('index address', function(t) {
        addFeature(conf, [1,0,0], [{
            properties: {
                _id: 1,
                _text:'fake street',
                _center:[-114.2578125,61.938950426660604],
                _rangetype:'tiger',
                _lfromhn: '0',
                _ltohn: '100',
            },
            geometry: {
                type:'LineString',
                coordinates:[[-114.2578125,61.938950426660604],[-105.46875,59.712097173322924]]
            }
        }], "address", t);
    });
    test('test address query with address range', function(t) {
        c.geocode('9 fake street', { limit_verify: 1 }, function (err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, '9 fake street', 'found 9 fake street');
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
    var conf = { address: new mem(null, {maxzoom: 1, geocoder_address: 1}, function() {}) };
    var c = new Carmen(conf);

    test('index address', function(t) {
        addFeature(conf, [1,0,0], [{
            properties: {
                _id:1,
                _text:'fake street',
                _center: [-97.03,64.62],
                _cluster: {
                    '9': { type: "Point", coordinates: [-112.85,62.75] },
                    '10': { type: "Point", coordinates: [-97.03,64.62] },
                    '7': { type: "Point", coordinates: [-104.76,57.32] }
                }
            },
            geometry: {
                type: "MultiPoint",
                coordinates: [[-112.85,62.75],[-97.03,64.62],[-104.76,57.32]]
            }
        }], "address", t);
    });
    test('test address query with alphanumeric', function(t) {
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
    var conf = { address: new mem(null, {maxzoom: 1, geocoder_address: 1}, function() {}) };
    var c = new Carmen(conf);

    test('index alphanum address', function(t) {
        addFeature(conf, [1,0,0], [{
            properties: {
                _id:1,
                _text:'fake street',
                _center: [-97.03,64.62],
                _cluster: {
                    '9b': { type: "Point", coordinates: [-112.85,62.75] },
                    '10c': { type: "Point", coordinates: [-97.03,64.62] },
                    '7': { type: "Point", coordinates: [-104.76,57.32] }
                }
            },
            geometry: {
                type: "MultiPoint",
                coordinates: [[-112.85,62.75],[-97.03,64.62],[-104.76,57.32]]
            }
        }], "address", t)

    });
    test('test address index for alphanumerics', function(t) {
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

//Ensures that relev takes into house number into consideration
(function() {
    var conf = { address: new mem(null, {maxzoom: 1, geocoder_address: 1}, function() {}) };
    var c = new Carmen(conf);

    test('index address', function(t) {
        addFeature(conf, [1,0,0], [{
            properties: {
                _id: 1,
                _text:'fake street',
                _center:[-97.03,64.62],
                _cluster: {
                    '9': { type: "Point", coordinates: [-112.85,62.75] },
                    '10': { type: "Point", coordinates: [-97.03,64.62] },
                    '7': { type: "Point", coordinates: [-104.76,57.32] }
                }
            },
            geometry: {
                type: "MultiPoint",
                coordinates: [[-112.85,62.75],[-97.03,64.62],[-104.76,57.32]]
            }
        }], "address", t);
    });
    test('test address index for relev', function(t) {
        c.geocode('9 fake street', { limit_verify: 1 }, function (err, res) {
            t.ifError(err);
            t.equals(res.features[0].relevance, 1);
            t.end();
        });
    });

    test('index teardown', function(t){
        index.teardown();
        t.end();
    });
})();

//Ensure that results that have equal relev in phrasematch
//are matched against the 0.5 relev bar instead of 0.75
(function() {
    var conf = { country: new mem(null, { maxzoom: 1 }, function() {}) };
    var c = new Carmen(conf);

    test('index country', function(t) {
        addFeature(conf, [1,0,0], [{
            properties: {
                _id: 1,
                _text: 'czech republic',
                _center: [-112.85,62.75]
            },
            geometry: {
                type: "Point",
                coordinates: [-112.85,62.75]
            }
        }, {
            properties: {
                _id: 2,
                _text: 'fake country two',
                _center: [-97.03,64.62]
            },
            geometry: {
                type: "Point",
                coordinates: [-97.03,64.62]
            }
        }], "country", t);
    });

    test('czech => czech repblic', function(t) {
        c.geocode('czech', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'czech republic');
            t.deepEqual(res.features[0].id, 'country.1');
            t.end();
        });
    });

    //Is not above 0.5 relev so should fail.
    test('fake => [fail]', function(t) {
        c.geocode('fake', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.notOk(res.features[0]);
            t.end();
        });
    });

    test('index teardown', function(t){
        index.teardown();
        t.end();
    });
})();

// Confirm that for equally relevant features across three indexes
// the one with the highest score beats the others.
(function() {
    var conf = {
        country: new mem(null, {maxzoom:6}, function() {}),
        province: new mem(null, {maxzoom:6}, function() {}),
        city: new mem(null, {maxzoom:6}, function() {}),
    };
    var c = new Carmen(conf);

    test('index country', function(t) {
        addFeature(conf, [6,32,32], [{
            properties: {
                _id: 1,
                _score: 5,
                _text: 'china'
            }
        }], "country", t);
    });

    test('index province', function(t) {
        addFeature(conf, [6,33,32], [{
            properties: {
                _id:2,
                _score: 10,
                _text: 'china'
            }
        }], "province", t);
    });

    test('index city', function(t) {
        addFeature(conf, [6,34,32], [{
            properties: {
                _id: 3,
                _score: 6,
                _text: 'china'
            }
        }], "city", t);
    });

    test('china', function(t) {
        c.geocode('china', { limit_verify:3 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].id, 'province.2');
            t.deepEqual(res.features[1].id, 'city.3');
            t.deepEqual(res.features[2].id, 'country.1');
            t.end();
        });
    });

    test('index teardown', function(t){
        index.teardown();
        t.end();
    });
})();

// Confirm that for equally relevant features across three indexes
// the first in hierarchy beats the others. (NO SCORES)
(function() {
    var conf = {
        country: new mem(null, {maxzoom:6}, function() {}),
        province: new mem(null, {maxzoom:6}, function() {}),
        city: new mem(null, {maxzoom:6}, function() {}),
    };
    var c = new Carmen(conf);

    test('index country', function(t) {
        addFeature(conf, [6,32,32], [{
            properties: {
                _id: 1,
                _text:'china'
            }
        }], "country", t);
    });
    test('index province', function(t) {
        addFeature(conf, [6,33,32], [{
            properties: {
                _id: 1,
                _text:'china'
            }
        }], "province", t);
    });
    test('index city', function(t) {
        addFeature(conf, [6,34,32], [{
            properties: {
                _id: 1,
                _text:'china'
            }
        }], "city", t);
    });
    test('china', function(t) {
        c.geocode('china', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'china');
            t.deepEqual(res.features[0].id, 'country.1');
            t.end();
        });
    });

    test('index teardown', function(t){
        index.teardown();
        t.end();
    });
})();


(function() {
    var conf = {
        province: new mem(null, {maxzoom:1}, function() {}),
        city: new mem(null, {maxzoom:6}, function() {}),
        street: new mem(null, { maxzoom:6, geocoder_address:1 }, function() {})
    };
    var c = new Carmen(conf);
    test('index province', function(t) {
        addFeature(conf, [1,1,1], [{
            properties: {
                _id: 1,
                _text: 'new york, ny'
            }
        }], "province", t);
    });

    test('index city 1', function(t) {
        addFeature(conf, [6,32,32], [{
            properties: {
                _id:1,
                _text:'new york, ny'
            }
        }], "city", t);
    });

    test('index city 2', function(t) {
        addFeature(conf, [6,33,32], [{
            properties: {
                _id:2,
                _text:'tonawanda'
            }
        }], "city", t);
    });

    test('index street 1', function(t) {
        addFeature(conf, [6,32,32], [{
            properties: {
                _id:1,
                _text:'west st'
            }
        }], "street", t);
    });

    test('index street 2', function(t) {
        addFeature(conf, [6,33,32], [{
            properties: {
                _id:2,
                _text:'west st'
            }
        }], "street", t);
    });

    test('west st, tonawanda, ny', function(t) {
        c.geocode('west st tonawanda ny', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'west st, tonawanda, new york');
            t.end();
        });
    });
    test('west st, new york, ny', function(t) {
        c.geocode('west st new york ny', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'west st, new york, new york');
            t.end();
        });
    });
    test('new york', function(t) {
        c.geocode('new york', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'new york');
            t.deepEqual(res.features[0].id, 'province.1');
            t.end();
        });
    });
    test('new york new york', function(t) {
        c.geocode('new york new york', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'new york, new york');
            t.deepEqual(res.features[0].id, 'city.1');
            t.end();
        });
    });
    test('ny ny', function(t) {
        c.geocode('ny ny', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'new york, new york');
            t.deepEqual(res.features[0].id, 'city.1');
            t.end();
        });
    });
    // failing
    test.skip('new york ny', function(t) {
        c.geocode('new york ny', { limit_verify:2 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'new york, new york');
            t.deepEqual(res.features[0].id, 'city.1');
            t.end();
        });
    });

    test('index teardown', function(t){
        index.teardown();
        t.end();
    });
})();

function addFeature(conf, zxy, features, layer, t) {
    features = features.map(function(feature) {
        feature = JSON.parse(JSON.stringify(feature));
        feature.type = 'Feature';
        if (feature.geometry) {
            feature.geometry = feature.geometry;
        } else {
            feature.geometry = tilebelt.tileToGeoJSON([zxy[1], zxy[2], zxy[0]]).geometry;
            var minX = feature.geometry.coordinates[0].reduce(function(memo, c) { return Math.min(memo, c[0]) }, Infinity);
            var maxX = feature.geometry.coordinates[0].reduce(function(memo, c) { return Math.max(memo, c[0]) }, -Infinity);
            var minY = feature.geometry.coordinates[0].reduce(function(memo, c) { return Math.min(memo, c[1]) }, Infinity);
            var maxY = feature.geometry.coordinates[0].reduce(function(memo, c) { return Math.max(memo, c[1]) }, -Infinity);
            feature.properties._center = feature.properties._center || [ minX + (maxX-minX)*0.5, minY + (maxY-minY)*0.5 ];
        }
        return feature;
    });

    var vtile = new mapnik.VectorTile(zxy[0],zxy[1],zxy[2]);
    vtile.addGeoJSON(JSON.stringify({
        type: 'FeatureCollection',
        features: features
    }), layer);

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

