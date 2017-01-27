// Suppose we are from an alien planet with 6 administrative levels, a-f.
// Suppose we process a query for "a b c d e f"
// Tests that stack gets truncated to 4 most specific elements.

var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature');
var Cache = require('@mapbox/carmen-cache').Cache;
var origCoalesce = Cache.coalesce;

var conf = {
    a: new mem({maxzoom: 6}, function() {}),
    b: new mem({maxzoom: 6}, function() {}),
    c: new mem({maxzoom: 6}, function() {}),
    d: new mem({maxzoom: 6}, function() {}),
    e: new mem({maxzoom: 6}, function() {}),
    f: new mem({maxzoom: 6}, function() {}),
};
var c = new Carmen(conf);

tape('mock/spy', function(assert) {
    Cache.coalesce = function(stack, options, callback) {
        assert.deepEqual(stack.length, 4, 'stack length == 4');
        origCoalesce.call(Cache, stack, options, callback);
    };
    assert.end();
});

tape('index a', function(t) {
    addFeature(conf.a, {
        id:1,
        properties: {
            'carmen:text':'a',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0],
        }
    }, t.end);
});
tape('index b', function(t) {
    addFeature(conf.b, {
        id:1,
        properties: {
            'carmen:text':'b',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0],
        }
    }, t.end);
});
tape('index c', function(t) {
    addFeature(conf.c, {
        id:1,
        properties: {
            'carmen:text':'c',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0],
        }
    }, t.end);
});
tape('index d', function(t) {
    addFeature(conf.d, {
        id:1,
        properties: {
            'carmen:text':'d',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0],
        }
    }, t.end);
});
tape('index e', function(t) {
    addFeature(conf.e, {
        id:1,
        properties: {
            'carmen:text':'e',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0],
        }
    }, t.end);
});
tape('index f', function(t) {
    addFeature(conf.f, {
        id:1,
        properties: {
            'carmen:text':'f',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0],
        }
    }, t.end);
});

tape('test spatialmatch stack truncate', function(t) {
    c.geocode('a b c d e f', {}, function(err, res) {
        t.ifError(err);
        t.equals(res.features.length, 4);
        t.equals(res.features[0].relevance, 1.00, 'Despite truncate, sets final relevance from context');
        t.equals(res.features[0].id, 'f.1');
        t.end();
    });
});

tape('test spatialmatch stack truncate (desc)', function(t) {
    c.geocode('f e d c b a', {}, function(err, res) {
        t.ifError(err);
        t.equals(res.features.length, 4);
        t.equals(res.features[0].relevance, 1.00, 'Despite truncate, sets final relevance from context');
        t.equals(res.features[0].id, 'f.1');
        t.end();
    });
});

tape('unmock/spy', function(assert) {
    Cache.coalesce = origCoalesce;
    assert.end();
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});

