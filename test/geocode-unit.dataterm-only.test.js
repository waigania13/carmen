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

tape('index address (dataterm only)', function(t) {
    var address = {
        _id:100,
        _text:'-',
        _zxy:['6/32/32'],
        _center:[0,0],
        _cluster: {
            100: { type: "Point", coordinates: [0,0] }
        }
    };
    addFeature(conf.address, address, t.end);
});

tape('test address', function(t) {
    c.geocode('100', { limit_verify: 1 }, function(err, res) {
        t.ifError(err);
        t.equals(res.features.length, 0);
        t.end();
    });
});

tape('index.teardown', function(assert) {
    index.teardown();
    context.getTile.cache.reset();
    assert.end();
});

