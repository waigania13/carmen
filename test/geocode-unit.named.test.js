// Test geocoder_name overlapping feature context prioritization

var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature');

var conf = {
    place_a: new mem({maxzoom:6, geocoder_name:'place'}, function() {}),
    place_b: new mem({maxzoom:6, geocoder_name:'place'}, function() {})
};
var c = new Carmen(conf);
tape('index place_a', function(t) {
    addFeature(conf.place_a, {
        _id:1,
        _text:'sadtown',
        _zxy:['6/32/32'],
        _center:[0,0]
    }, t.end);
});
tape('index place_b', function(t) {
    addFeature(conf.place_b, {
        _id:2,
        _text:'funtown',
        _zxy:['6/32/32'],
        _center:[0,0]
    }, t.end);
});
tape('sadtown', function(t) {
    c.geocode('sadtown', { limit_verify:1 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'sadtown');
        t.deepEqual(res.features[0].id, 'place.1');
        t.end();
    });
});
tape('funtown', function(t) {
    c.geocode('funtown', { limit_verify:1 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'funtown');
        t.deepEqual(res.features[0].id, 'place.2');
        t.end();
    });
});

tape('index.teardown', function(assert) {
    index.teardown();
    context.getTile.cache.reset();
    assert.end();
});

