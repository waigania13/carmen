var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature');

var conf = {
    country: new mem({ maxzoom: 6 }, function() {})
};

var c = new Carmen(conf);
tape('index country', function(assert) {
    addFeature(conf.country, {
        id: 1,
        geometry: {
            type: 'Point',
            coordinates: [0,0]
        },
        properties: {
            // Line smiley
            'carmen:text': decodeURIComponent('%E2%98%BA'),
            'carmen:center': [0,0]
        }
    }, assert.end);
});

tape('should not find feaure (atm)', function(assert) {
    // Line smiley
    c.geocode(decodeURIComponent('%E2%98%BA'), {}, function(err, res) {
        assert.ifError(err);
        assert.equal(res.features.length, 0, 'finds no features');
        assert.end();
    });
});

tape('should not find feaure (atm or ever -- different emoji)', function(assert) {
    // Filled smiley
    c.geocode(decodeURIComponent('%E2%98%BB'), {}, function(err, res) {
        assert.ifError(err);
        assert.equal(res.features.length, 0, 'finds no features');
        assert.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});

