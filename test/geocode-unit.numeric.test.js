var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature');

var conf = {
    postcode: new mem({maxzoom: 6}, function() {})
};
var c = new Carmen(conf);

tape('index', function(assert) {
    addFeature(conf.postcode, {
        _id:1,
        _text:'22209',
        _zxy:['6/32/32'],
        _center:[0,0]
    }, assert.end);
});

tape('index', function(assert) {
    addFeature(conf.postcode, {
        _id:2,
        _text:'22209 restaurant',
        _zxy:['6/32/32'],
        _center:[0,0]
    }, assert.end);
});

tape('query', function(t) {
    c.geocode('22209', { limit_verify: 2 }, function(err, res) {
        t.ifError(err);
        // 22209 does not win here until we have suggest vs final modes.
        t.equals(res.features[0].place_name, '22209', 'found 22209');
        t.equals(res.features[0].relevance, 0.99);
        t.equals(res.features[1].place_name, '22209 restaurant', 'found 22209 restaurant');
        t.equals(res.features[1].relevance, 0.99);
        t.end();
    });
});

tape('indexes degen', function(t) {
    c.geocode('222', { limit_verify: 1 }, function(err, res) {
        t.ifError(err);
        t.equals(res.features.length, 1);
        t.end();
    });
});

tape('does index degens for non-numeric terms', function(t) {
    c.geocode('22209 rest', { limit_verify: 2 }, function(err, res) {
        t.ifError(err);
        t.equals(res.features[0].place_name, '22209 restaurant', 'found 22209 restaurant');
        t.end();
    });
});

tape('index.teardown', function(assert) {
    index.teardown();
    context.getTile.cache.reset();
    assert.end();
});

