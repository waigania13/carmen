var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('queue-async');
var addFeature = require('../lib/util/addfeature');

var conf = {
    country: new mem({maxzoom: 6, geocoder_name:'country'}, function() {}),
    region: new mem({maxzoom: 6, geocoder_name:'region'}, function() {}),
    postcode: new mem({maxzoom: 6, geocoder_name:'postcode'}, function() {}),
    address: new mem({maxzoom: 6, geocoder_address: 1, geocoder_name:'address'}, function() {}),
};
var c = new Carmen(conf);

tape('index address (noise)', function(t) {
    var q = queue(1);
    for (var i = 1; i < 20; i++) q.defer(function(i, done) {
        var address = {
            _id:i,
            _text:'Austria St',
            _zxy:['6/32/32'],
            _center:[i,0],
            _cluster: {
                2000: { type: "Point", coordinates: [i,0] }
            }
        };
        addFeature(conf.address, address, done);
    }, i);
    q.awaitAll(t.end);
});

tape('index country', function(t) {
    addFeature(conf.country, {
        _id:1,
        _text:'Austria',
        _zxy:['6/33/32'],
        _center:[360/64+0.001,0]
    }, t.end);
});

tape('index postcode', function(t) {
    addFeature(conf.postcode, {
        _id:1,
        _text:'2000',
        _zxy:['6/33/32'],
        _center:[360/64+0.001,0]
    }, t.end);
});

tape('test address', function(t) {
    c.geocode('2000 Austria', { limit_verify: 5 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].id, 'postcode.1');
        t.end();
    });
});

tape('index.teardown', function(assert) {
    index.teardown();
    context.getTile.cache.reset();
    assert.end();
});

