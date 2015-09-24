// Ensures that relev takes into house number into consideration
// Also ensure relev is applied to US & Non-US Style addresses

var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('queue-async');
var addFeature = require('../lib/util/addfeature');

//Test geocoder_address formatting
(function() {
    var conf = {
        address: new mem({maxzoom: 6, geocoder_address: '{name} {num}'}, function() {})
    };
    var c = new Carmen(conf);
    tape('index address', function(t) {
        var address = {
            id:1,
            properties: {
                'carmen:text': 'fake street',
                'carmen:center': [0,0],
                'carmen:addressnumber': ['9','10','7']
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,0],[0,0],[0,0]]
            }
        };
        addFeature(conf.address, address, t.end);
    });

    tape('Search for germany style address', function(t) {
        c.geocode('fake street 9', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.deepEquals(res, { features: [ { address: '9', center: [ 0, 0 ], geometry: { coordinates: [ 0, 0 ], type: 'Point' }, id: 'address.1', place_name: 'fake street 9', properties: {}, relevance: 0.99, text: 'fake street', type: 'Feature' } ], query: [ 'fake', 'street', '9' ], type: 'FeatureCollection' });
            t.end();
        });
    });

    tape('Search for us style address with german formatting', function(t) {
        c.geocode('9 fake street', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.deepEquals(res, { features: [ { address: '9', center: [ 0, 0 ], geometry: { coordinates: [ 0, 0 ], type: 'Point' }, id: 'address.1', place_name: 'fake street 9', properties: {}, relevance: 0.99, text: 'fake street', type: 'Feature' } ], query: [ '9', 'fake', 'street' ], type: 'FeatureCollection' });
            t.end();
        });
    });
})();

//Test geocoder_address formatting for multiple layers
(function() {
    var conf = {
        country: new mem({ maxzoom:6 }, function() {}),
        address: new mem({maxzoom: 6, geocoder_address: '{name} {num}'}, function() {})
    };
    var c = new Carmen(conf);
    tape('index country', function(t) {
        var country = {
            _id:1,
            _text:'czech republic',
            _zxy:['6/32/32'],
            _center:[0,0]
        };
        addFeature(conf.country, country, t.end);
    });

    tape('index address', function(t) {
            var address = {
                _id:1,
                _text:'fake street',
                _zxy:['6/32/32'],
                _center:[0,0],
                _cluster: {
                    9: { type: "Point", coordinates: [0,0] },
                    10: { type: "Point", coordinates: [0,0] },
                    7: { type: "Point", coordinates: [0,0] }
                }
            };
            addFeature(conf.address, address, t.end);
    });

    tape('Search for germany style address - multiple layers', function(t) {
        c.geocode('fake street 9', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.deepEquals(res, { features: [ { address: '9', center: [ 0, 0 ], context: [ { id: 'country.1', text: 'czech republic' } ], geometry: { coordinates: [ 0, 0 ], type: 'Point' }, id: 'address.1', place_name: 'fake street 9, czech republic', properties: {}, relevance: 0.99, text: 'fake street', type: 'Feature' } ], query: [ 'fake', 'street', '9' ], type: 'FeatureCollection' });
            t.end();
        });
    });

    tape('Search for us style address with german formatting - multiple layers', function(t) {
        c.geocode('9 fake street', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.deepEquals(res, { features: [ { address: '9', center: [ 0, 0 ], context: [ { id: 'country.1', text: 'czech republic' } ], geometry: { coordinates: [ 0, 0 ], type: 'Point' }, id: 'address.1', place_name: 'fake street 9, czech republic', properties: {}, relevance: 0.99, text: 'fake street', type: 'Feature' } ], query: [ '9', 'fake', 'street' ], type: 'FeatureCollection' });
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
                    9: { type: "Point", coordinates: [0,0] },
                    10: { type: "Point", coordinates: [0,0] },
                    7: { type: "Point", coordinates: [0,0] }
                }
            };
            addFeature(conf.address, address, t.end);
    });

    tape('test address index for US relev', function(t) {
        c.geocode('9 fake street', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].relevance, 0.99);
            t.end();
        });
    });

    tape('test address index for DE relev', function(t) {
        c.geocode('fake street 9', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].relevance, 0.99);
            t.end();
        });
    });

    // This test should have a very poor relev as the number
    // is found within the street name
    // Unclear whether this should work really...
    tape.skip('test address index for random relev', function(t) {
        c.geocode('fake 9 street', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].relevance, 0.3225806451612903);
            t.end();
        });
    });
})();

//If the layer does not have geocoder_address do not take house number into account
(function() {
    var conf = {
        address: new mem({maxzoom: 6}, function() {})
    };
    var c = new Carmen(conf);
    tape('index address', function(t) {
            var address = {
                _id:1,
                _text:'fake street',
                _zxy:['6/32/32'],
                _center:[0,0]
            };
            addFeature(conf.address, address, t.end);
    });
    tape('test address index for relev', function(t) {
        c.geocode('9 fake street', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].relevance, 0.6566666666666666);
            t.end();
        });
    });
})();

tape('index.teardown', function(assert) {
    index.teardown();
    context.getTile.cache.reset();
    assert.end();
});

