// Test that cluster results are prioritized over itp results when
// present and otherwise equal.

var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature');

var conf = {
    addressitp: new mem({maxzoom: 6, geocoder_address: 1, geocoder_name:'address'}, function() {}),
    address: new mem({maxzoom: 6, geocoder_address: 1, geocoder_name:'address'}, function() {})
};
var c = new Carmen(conf);
tape('index address', function(t) {
    var address = {
        _id:1,
        _text:'fake street',
        _zxy:['6/32/32'],
        _center:[0,0],
        _cluster: {
            100: { type: "Point", coordinates: [0,0] }
        }
    };
    addFeature(conf.address, address, t.end);
});
tape('index addressitp', function(t) {
    var addressitp = {
        _id:1,
        _text:'fake street',
        _zxy:['6/32/32'],
        _center:[0,0],
        _rangetype:'tiger',
        _parityr: 'O',
        _rfromhn: '1',
        _rtohn: '91',
        _parityl: 'E',
        _lfromhn: '0',
        _ltohn: '90',
        _geometry: {
            type:'LineString',
            coordinates:[[0,0],[0,1]]
        }
    };
    addFeature(conf.addressitp, addressitp, t.end);
});
tape('test address query with address range', function(t) {
    c.geocode('100 fake street', { limit_verify: 2 }, function (err, res) {
        t.ifError(err);
        t.equals(res.features[0].place_name, '100 fake street', 'found 100 fake street');
        t.equals(res.features[0].relevance, 0.99);
        t.end();
    });
});

//Reverse geocode will return a pt since it is futher down in the stack than itp
tape('test reverse address query with address range', function(t) {
    c.geocode('0,0', { limit_verify: 2 }, function (err, res) {
        t.ifError(err);
        t.equals(res.features[0].place_name, '100 fake street', 'found 100 fake street');
        t.equals(res.features[0].relevance, 1);
        t.end();
    });
});

tape('index.teardown', function(assert) {
    index.teardown();
    context.getTile.cache.reset();
    assert.end();
});

