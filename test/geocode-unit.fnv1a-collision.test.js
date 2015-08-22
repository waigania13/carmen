var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('queue-async');
var addFeature = require('../lib/util/addfeature');

var conf = {
    test: new mem({ maxzoom:6, geocoder_address:'{name} {num}' }, function() {})
};
var c = new Carmen(conf);
tape('index "av francisco de aguirre #"', function(t) {
    addFeature(conf.test, {
        _id:1,
        _text:'av francisco de aguirre',
        _zxy:['6/32/32'],
        _center:[0,0],
        _cluster: { 2: { type: "Point", coordinates: [0,0] } }
    }, t.end);
});
tape('index "# r ademar da silva neiva"', function(t) {
    addFeature(conf.test, {
        _id:2,
        _text:'r ademar da silva neiva',
        _zxy:['6/32/32'],
        _center:[0,0],
        _cluster: { 2: { type: "Point", coordinates: [0,0] } }
    }, t.end);
});
// partial unidecoded terms do not match
tape('search: "av francisco de aguirre 2 la serena"', function(t) {
    c.geocode('av francisco de aguirre 2 la serena', { limit_verify:2 }, function(err, res) {
        t.equal(res.features.length, 1);
        t.equal(res.features[0].id, 'test.1');
        t.end();
    });
});

tape('index.teardown', function(assert) {
    index.teardown();
    context.getTile.cache.reset();
    assert.end();
});

