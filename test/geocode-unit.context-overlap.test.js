// Test geocoder_name overlapping feature context prioritization

var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var mem = require('../lib/api-mem');
var addFeature = require('./util/addfeature');

var conf = {
    place_a: new mem({maxzoom:6, geocoder_name:'place'}, function() {}),
    place_b: new mem({maxzoom:6, geocoder_name:'place'}, function() {}),
    street_a: new mem({maxzoom:6, geocoder_name:'street'}, function() {}),
    street_b: new mem({maxzoom:6, geocoder_name:'street'}, function() {})
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
tape('index street_a', function(t) {
    addFeature(conf.street_a, {
        _id:2,
        _text:'wall street',
        _zxy:['6/32/32'],
        _center:[0,0]
    }, t.end);
});
tape('index street_b', function(t) {
    addFeature(conf.street_b, {
        _id:1,
        _text:'main street',
        _zxy:['6/32/32'],
        _center:[0,0]
    }, t.end);
});
tape('geocoder_name dedupe', function(t) {
    c.geocode('main street', { limit_verify:1 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'main street, funtown');
        t.deepEqual(res.features[0].id, 'street.1');
        t.deepEqual(res.features[0].context.length, 1);
        t.deepEqual(res.features[0].context.map(function(c) { return c.text }), ['funtown']);
        t.end();
    });
});

tape('index.teardown', function(assert) {
    index.teardown();
    assert.end();
});

