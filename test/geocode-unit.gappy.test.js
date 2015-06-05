// Unit tests for gappy stacking of features ("west st new york")

var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var mem = require('../lib/api-mem');
var queue = require('queue-async');
var addFeature = require('./util/addfeature');

// limit_verify 1 implies that the correct result must be the very top
// result prior to context verification. It means even with a long list
// of competing results the correct candidate is sorted to the top.

// limit_verify 2 implies that there is some ambiguity prior to context
// verification (e.g. new york (city) vs new york (province)) that is sorted
// into the correct order after context verification occurs.

var conf = {
    province: new mem(null, function() {}),
    city: new mem(null, function() {}),
    street: new mem({ maxzoom:6, geocoder_address:1 }, function() {})
};
var c = new Carmen(conf);
tape('index province', function(t) {
    var province = {
        _id:1,
        _text:'new york, ny',
        _zxy:['6/32/32','6/33/32'],
        _center:[0,0]
    };
    addFeature(conf.province, province, t.end);
});
tape('index city 1', function(t) {
    var city = {
        _id:1,
        _text:'new york, ny',
        _zxy:['6/32/32'],
        _center:[0,0]
    };
    addFeature(conf.city, city, t.end);
});
tape('index city 2', function(t) {
    var city = {
        _id:2,
        _text:'tonawanda',
        _zxy:['6/33/32'],
        _center:[360/64+0.001,0]
    };
    addFeature(conf.city, city, t.end);
});
tape('index street 1', function(t) {
    var street = {
        _id:1,
        _text:'west st',
        _zxy:['6/32/32'],
        _center:[0,0]
    };
    addFeature(conf.street, street, t.end);
});
tape('index street 2', function(t) {
    var street = {
        _id:2,
        _text:'west st',
        _zxy:['6/33/32'],
        _center:[360/64+0.001,0]
    };
    addFeature(conf.street, street, t.end);
});
tape('west st, tonawanda, ny', function(t) {
    c.geocode('west st tonawanda ny', { limit_verify:1 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'west st, tonawanda, new york');
        t.end();
    });
});
tape('west st, new york, ny', function(t) {
    c.geocode('west st new york ny', { limit_verify:1 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'west st, new york, new york');
        t.end();
    });
});
tape('new york', function(t) {
    c.geocode('new york', { limit_verify:1 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'new york');
        t.deepEqual(res.features[0].id, 'province.1');
        t.end();
    });
});
tape('new york new york', function(t) {
    c.geocode('new york new york', { limit_verify:2 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'new york, new york');
        t.deepEqual(res.features[0].id, 'city.1');
        t.end();
    });
});
tape('ny ny', function(t) {
    c.geocode('ny ny', { limit_verify:2 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'new york, new york');
        t.deepEqual(res.features[0].id, 'city.1');
        t.end();
    });
});
// failing
tape.skip('new york ny', function(t) {
    c.geocode('new york ny', { limit_verify:2 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'new york, new york');
        t.deepEqual(res.features[0].id, 'city.1');
        t.end();
    });
});

tape('index.teardown', function(assert) {
    index.teardown();
    assert.end();
});

