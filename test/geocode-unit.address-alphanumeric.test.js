// Alphanumeric and hyphenated housenumbers

var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('queue-async');
var addFeature = require('../lib/util/addfeature');

(function() {
    var conf = {
        address: new mem({maxzoom: 6, geocoder_address: 1}, function() {})
    };
    var c = new Carmen(conf);
    tape('index alphanum address', function(t) {
            var address = {
                _id:1,
                _text:'fake street',
                _zxy:['6/32/32'],
                _center:[0,0],
                _cluster: {
                    '9b': { type: "Point", coordinates: [0,0] },
                    '10c': { type: "Point", coordinates: [0,0] },
                    '7': { type: "Point", coordinates: [0,0] }
                }
            };
            addFeature(conf.address, address, t.end);
    });
    tape('test address index for alphanumerics', function(t) {
        c.geocode('9b fake street', { limit_verify: 1 }, function (err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, '9b fake street', 'found 9b fake street');
            t.equals(res.features[0].relevance, 0.99);
            t.end();
        });
    });
})();

(function() {
    var conf = {
        address: new mem({maxzoom: 6, geocoder_address: 1}, function() {})
    };
    var c = new Carmen(conf);
    tape('index address', function(t) {
            var address = {
                _id:1,
                _text:'fake street',
                _zxy:['6/32/32'],
                _center:[0,0],
                _cluster: {
                    '9': { type: "Point", coordinates: [0,0] },
                    '10': { type: "Point", coordinates: [0,0] },
                    '7': { type: "Point", coordinates: [0,0] }
                }
            };
            addFeature(conf.address, address, t.end);
    });
    tape('test address query with alphanumeric', function(t) {
        c.geocode('9b fake street', { limit_verify: 1 }, function (err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, '9b fake street', 'found 9b fake street');
            t.equals(res.features[0].relevance, 0.99);
            t.end();
        });
    });
})();

(function() {
    var conf = {
        address: new mem({maxzoom: 6, geocoder_address: 1}, function() {})
    };
    var c = new Carmen(conf);
    tape('index address', function(t) {
            var address = {
                _id:1,
                _text:'fake street',
                _zxy:['6/32/32'],
                _center:[0,0],
                _rangetype:'tiger',
                _lfromhn: '0',
                _ltohn: '100',
                _geometry: {
                    type:'LineString',
                    coordinates:[[0,0],[0,100]]
                }
            };
            addFeature(conf.address, address, t.end);
    });
    tape('test alphanumeric address query with address range', function(t) {
        c.geocode('9b fake street', { limit_verify: 1 }, function (err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, '9b fake street', 'found 9b fake street');
            t.equals(res.features[0].relevance, 0.99);
            t.equals(res.features[0].address, '9b', 'address number is 9b');
            t.end();
        });
    });

    tape('test alphanumeric address query with invalid address number', function(t) {
        c.geocode('9bc fake street', { limit_verify: 1 }, function (err, res) {
            t.ifError(err);
            t.ok(res.features[0].place_name, 'fake street', 'found fake street feature');
            t.ok((res.features[0].relevance < 0.6), 'appropriate relevance (9bc token should not be matched)');
            t.ok((res.features[0].address === undefined), 'address number is not defined');
            t.end();
        });
    });
})();

(function() {
    var conf = {
        postcode: new mem({maxzoom: 6 }, function() {}),
        address: new mem({maxzoom: 6, geocoder_address: 1}, function() {})
    };
    var c = new Carmen(conf);
    tape('index fake UK address range', function(t) {
            var address = {
                _id: 1,
                _text:'B77',
                _zxy:['6/32/32'],
                _center:[0,0],
                _rangetype:'tiger',
                _lfromhn: '0',
                _ltohn: '100',
                _geometry: {
                    type:'LineString',
                    coordinates:[[0,0],[0,100]]
                }
            };
            addFeature(conf.address, address, t.end);
    });
    tape('index fake UK postcode', function(t) {
            var postcode = {
                _id: 2,
                _text:'B77 1AB',
                _zxy:['6/32/32'],
                _center:[0,0],
                _geometry: {
                    type: 'Polygon',
                    coordinates: [
                        [-1, -1],
                        [101, -1],
                        [101, 101],
                        [-1, 101],
                        [-1, -1]
                    ]
                }
            };
            addFeature(conf.postcode, postcode, t.end);
    });
    tape('test UK postcode not getting confused w/ address range', function(t) {
        c.geocode('B77 1AB', { limit_verify: 10 }, function (err, res) {
            t.equals(res.features[0].place_name, 'B77 1AB', 'found feature \'B77 1AB\'');
            t.equals(res.features[0].relevance, 0.99);
            t.equals(res.features[0].id.split('.')[0], 'postcode', 'feature is from layer postcode');
            var addressInResultSet = res.features.some(function(feature) { return feature.id.split('.')[0] === 'address' });
            t.ok(!addressInResultSet, 'result set does not include address feature');
            t.end();
        });
    });
})();

(function() {
    var conf = {
        address: new mem({maxzoom: 6, geocoder_address: 1}, function() {})
    };
    var c = new Carmen(conf);
    tape('index address', function(t) {
            var address = {
                _id:1,
                _text:'beach street',
                _zxy:['6/32/32'],
                _center:[0,0],
                _rangetype:'tiger',
                _lfromhn: '23-100',
                _ltohn: '23-500',
                _geometry: {
                    type:'LineString',
                    coordinates:[[0,0],[0,100]]
                }
            };
            addFeature(conf.address, address, t.end);
    });
    tape('test hyphenated address query with address range', function(t) {
        c.geocode('23-414 beach street', { limit_verify: 1 }, function (err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, '23-414 beach street', 'found 23-414 beach street');
            t.equals(res.features[0].relevance, 0.99);
            t.end();
        });
    });
})();

tape('index.teardown', function(assert) {
    index.teardown();
    context.getTile.cache.reset();
    assert.end();
});

