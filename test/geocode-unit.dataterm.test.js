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

tape('index address (noise)', function(t) {
    var q = queue(1);
    for (var i = 1; i < 41; i++) q.defer(function(i, done) {
        var address = {
            _id:i,
            _text:'fake street',
            _zxy:['6/32/32'],
            _center:[0,0],
            _cluster: {
                600: { type: "Point", coordinates: [0,0] }
            }
        };
        addFeature(conf.address, address, done);
    }, i);
    q.awaitAll(t.end);
});

tape('index address (signal)', function(t) {
    var address = {
        _id:101,
        _text:'fake street',
        _zxy:['6/32/32'],
        _center:[0,0],
        _cluster: {
            1500: { type: "Point", coordinates: [0,0] }
        }
    };
    addFeature(conf.address, address, t.end);
});

tape('test address', function(t) {
    c.geocode('1500 fake street', { limit_verify: 1 }, function(err, res) {
        t.ifError(err);
        t.equals(res.features[0].place_name, '1500 fake street', 'found 1500 fake street');
        t.equals(res.features[0].relevance, 0.99);
        t.end();
    });
});

tape('index.teardown', function(assert) {
    index.teardown();
    context.getTile.cache.reset();
    assert.end();
});

