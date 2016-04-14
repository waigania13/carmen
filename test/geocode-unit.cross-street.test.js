// Ensures that relev takes into house number into consideration
// Also ensure relev is applied to US & Non-US Style addresses

var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('queue-async');
var addFeature = require('../lib/util/addfeature');

// Test geocoder_address formatting + return place_name as germany style address (address number follows name)
(function() {
    var conf = {
        address: new mem({
          maxzoom: 6,
        }, function() {}),
    };
    var c = new Carmen(conf);
    tape('index address', function(t) {
        var address = {
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
        addFeature(conf.address, address, t.end);
    });

    tape('main street', function(t) {
        var address = {
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
        addFeature(conf.address, address, t.end);
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
            console.log(JSON.stringify(res, null, 2));
            t.ifError(err);
            t.equals(res.features[0].place_name, 'fake street');
            t.end();
        });
    });

    tape('Search for cross street', function(t) {
        // expecting this to return two streets, as one feature
        // currently returns one st
        c.geocode('fake street main street', {}, function(err, res) {
            console.log(JSON.stringify(res, null, 2));
            t.ifError(err);
            t.equals(res.features[0].place_name, 'fake street and main street');
            t.end();
        });
    });

})();

tape('index.teardown', function(assert) {
    index.teardown();
    context.getTile.cache.reset();
    assert.end();
});
