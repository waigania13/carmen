// Ensures that verifymatch returns intersections of cross streets

var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('queue-async');
var addFeature = require('../lib/util/addfeature');

(function() {
    var conf = {
        city: new mem({ maxzoom: 6, geocoder_address: true }, function() {}),
        street: new mem({ maxzoom: 6, geocoder_address: true }, function() {}),
    };

    var c = new Carmen(conf);

    tape('index city', function(t) {
        var city = {
            id:1,
            properties: {
                'carmen:text':'nontown',
                // 'carmen:zxy':['6/32/32','6/33/32'],
                'carmen:center':[5,5]
            },
            geometry: {
                type: 'Polygon',
                coordinates: [[[0,0], [0,10], [10,10], [10,0], [0,0]]]
            }
        };
        addFeature(conf.city, city, t.end);
    });

    tape('fake street', function(t) {
        var street = {
            id:1,
            properties: {
                'carmen:text': 'fake street',
                'carmen:center': [5,0],
            },
            geometry: {
                type: 'LineString',
                coordinates: [[5,0],[5,10]]
            }
        };
        addFeature(conf.street, street, t.end);
        console.log('added fake st');
    });

    tape('main street', function(t) {
        var street = {
            id:2,
            properties: {
                'carmen:text': 'main street',
                'carmen:center': [0,5],
            },
            geometry: {
                type: 'LineString',
                coordinates: [[0,5],[10,5]]
            }
        };
        addFeature(conf.street, street, t.end);
    });

    tape.skip('Search for main street', function(t) {
        c.geocode('main street', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'main street');
            t.end();
        });
    });

    tape.skip('Search for fake street', function(t) {
        c.geocode('fake street', {}, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'fake street');
            t.end();
        });
    });

    tape('Search for simple cross street', function(t) {
        c.geocode('fake street main street', {}, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'fake street & main street, nontown');
            t.end();
        });
    });

    tape('Search for complex cross street', function(t) {
        c.geocode('fake street and main street, nontown', {}, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'fake street & main street, nontown');
            t.end();
        });
    });
})();

tape('index.teardown', function(assert) {
    index.teardown();
    context.getTile.cache.reset();
    assert.end();
});
