var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var mem = require('../lib/api-mem');
var queue = require('queue-async');
var addFeature = require('../lib/util/addfeature');

var conf = {
    address: new mem({maxzoom: 6, geocoder_address: '{name} {num}', geocoder_name:'address'}, function() {})
};
var c = new Carmen(conf);

tape('index address', function(t) {
    var address = {
        _id:1,
        _text:'Brehmestraße',
        _zxy:['6/32/32'],
        _center:[0,0],
        _cluster: {
            56: { type: "Point", coordinates: [0,0] }
        }
    };
    addFeature(conf.address, address, t.end);
});

tape('test address', function(t) {
    c.geocode('56 Brehmestr.', { limit_verify: 1 }, function (err, res) {
        t.ifError(err);
        t.equals(res.features[0] && res.features[0].place_name, 'Brehmestraße 56');
        t.end();
    });
});

// Real solution here is regex token for *strasse => *str
tape.skip('test address', function(t) {
    c.geocode('Brehmestr. 56', { limit_verify: 1 }, function (err, res) {
        t.ifError(err);
        t.equals(res.features[0] && res.features[0].place_name, 'Brehmestraße 56');
        t.end();
    });
});

tape('index.teardown', function(assert) {
    index.teardown();
    assert.end();
});

