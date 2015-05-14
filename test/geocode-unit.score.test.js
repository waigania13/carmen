// Test score handling across indexes

var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var mem = require('../lib/api-mem');
var queue = require('queue-async');
var addFeature = require('./util/addfeature');

// Confirm that for equally relevant features across three indexes
// the first in hierarchy beats the others. (NO SCORES)
(function() {
    var conf = {
        country: new mem(null, function() {}),
        province: new mem(null, function() {}),
        city: new mem(null, function() {}),
    };
    var c = new Carmen(conf);
    tape('index country', function(t) {
        var country = {
            _id:1,
            _text:'china',
            _zxy:['6/32/32'],
            _center:[0,0]
        };
        addFeature(conf.country, country, t.end);
    });
    tape('index province', function(t) {
        var province = {
            _id:1,
            _text:'china',
            _zxy:['6/33/32'],
            _center:[360/64,0]
        };
        addFeature(conf.province, province, t.end);
    });
    tape('index city', function(t) {
        var city = {
            _id:1,
            _text:'china',
            _zxy:['6/34/32'],
            _center:[360/64*2,0]
        };
        addFeature(conf.city, city, t.end);
    });
    tape('china', function(t) {
        c.geocode('china', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'china');
            t.deepEqual(res.features[0].id, 'country.1');
            t.end();
        });
    });
})();

// Confirm that for equally relevant features across three indexes
// the one with the highest score beats the others.
(function() {
    var conf = {
        country: new mem(null, function() {}),
        province: new mem(null, function() {}),
        city: new mem(null, function() {}),
    };
    var c = new Carmen(conf);
    tape('index country', function(t) {
        var country = {
            _id:1,
            _score: 5,
            _text:'china',
            _zxy:['6/32/32'],
            _center:[0,0]
        };
        addFeature(conf.country, country, t.end);
    });
    tape('index province', function(t) {
        var province = {
            _id:2,
            _score: 10,
            _text:'china',
            _zxy:['6/33/32'],
            _center:[360/64,0]
        };
        addFeature(conf.province, province, t.end);
    });
    tape('index city', function(t) {
        var city = {
            _id:3,
            _score: 6,
            _text:'china',
            _zxy:['6/34/32'],
            _center:[360/64*2,0]
        };
        addFeature(conf.city, city, t.end);
    });
    tape('china', function(t) {
        c.geocode('china', { limit_verify:3, allow_dupes: true }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].id, 'province.2');
            t.deepEqual(res.features[1].id, 'city.3');
            t.deepEqual(res.features[2].id, 'country.1');
            t.deepEqual(res.features.length, 3);
            t.end();
        });
    });
    tape('china (dedupe)', function(t) {
        c.geocode('china', { limit_verify:3 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].id, 'province.2');
            t.deepEqual(res.features.length, 1);
            t.end();
        });
    });
})();

tape('index.teardown', function(assert) {
    index.teardown();
    assert.end();
});

