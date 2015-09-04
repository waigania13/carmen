//Test bitmask based address determination (See lib/verifymatch)

var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('queue-async');
var addFeature = require('../lib/util/addfeature');

var conf = {
    address: new mem({maxzoom: 6, geocoder_address: 1, geocoder_name:'address'}, function() {})
};
var c = new Carmen(conf);
tape('index address', function(t) {
    var address = {
        _id:1,
        _text:'1 test street',
        _zxy:['6/32/32'],
        _center:[0,0],
        _cluster: {
            100: { type: "Point", coordinates: [0,0] }
        }
    };
    addFeature(conf.address, address, t.end);
});
tape('index address', function(t) {
    var address = {
        _id:2,
        _text:'baker street',
        _zxy:['6/32/32'],
        _center:[0,0],
        _cluster: {
            '500': { type: "Point", coordinates: [0,0] },
            '500b': { type: "Point", coordinates: [0,0] }
        }
    };
    addFeature(conf.address, address, t.end);
});
tape('index address', function(t) {
    var address = {
        _id:3,
        _text:'15th street',
        _zxy:['6/32/32'],
        _center:[0,0],
        _cluster: {
            '500': { type: "Point", coordinates: [0,0] },
            '500b': { type: "Point", coordinates: [0,0] }
        }
    };
    addFeature(conf.address, address, t.end);
});

tape('full address', function(t) {
    c.geocode('500 baker street', { limit_verify: 2 }, function (err, res) {
        t.ifError(err);
        t.equals(res.features[0].address, '500', '500');
        t.end();
    });
});

tape('no address', function(t) {
    c.geocode('baker street', { limit_verify: 2 }, function (err, res) {
        t.ifError(err);
        t.notok(res.features[0].address);
        t.end();
    });
});

tape('only number', function(t) {
    c.geocode('500', { limit_verify: 2 }, function (err, res) {
        t.ifError(err);
        t.notok(res.features.length);
        t.end();
    });
});

tape('lettered address', function(t) {
    c.geocode('500b baker street', { limit_verify: 2 }, function (err, res) {
        t.ifError(err);
        t.equals(res.features[0].address, '500b');
        t.end();
    });
});

tape('lettered address', function(t) {
    c.geocode('baker street 500b', { limit_verify: 2 }, function (err, res) {
        t.ifError(err);
        t.equals(res.features[0].address, '500b');
        t.end();
    });
});

tape('numbered street address', function(t) {
    c.geocode('15th street 500b', { limit_verify: 2 }, function (err, res) {
        t.ifError(err);
        t.equals(res.features[0].address, '500b');
        t.end();
    });
});

// @TODO maskAddress needs to select multiple candidate addresses now...
tape.skip('test de - number street with address', function(t) {
    c.geocode('1 test street 100', { limit_verify: 2 }, function (err, res) {
        t.ifError(err);
        t.equals(res.features[0].place_name, '100 1 test street', '100 1 test street');
        t.equals(res.features[0].address, '100');
        t.end();
    });
});

tape('test us number street with address', function(t) {
    c.geocode('100 1 test street', { limit_verify: 2 }, function (err, res) {
        t.ifError(err);
        t.equals(res.features[0].place_name, '100 1 test street', '100 1 test street');
        t.equals(res.features[0].address, '100');
        t.end();
    });
});

tape('index.teardown', function(assert) {
    index.teardown();
    context.getTile.cache.reset();
    assert.end();
});

