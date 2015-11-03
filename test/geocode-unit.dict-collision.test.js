var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('queue-async');
var addFeature = require('../lib/util/addfeature');
var Dictcache = require('../lib/util/dictcache');
var termops = require('../lib/util/termops.js');

var conf = {
    place: new mem(null, function() {}),
};
var c = new Carmen(conf);
// shrink the dictcache a lot
c.indexes.place._dictcache = new Dictcache(null, 10);

tape('index junk places', function(t) {
    var q = queue(1);
    for (var i = 1; i < 101; i++) {
        q.defer(function(j, callback) {
            var place = {
                _id: j,
                _text: 'a' + j,
                _zxy:['6/32/32','6/34/32'],
                _center:[0,0]
            };
            addFeature(conf.place, place, callback);
        }, i);
    }
    q.awaitAll(t.end);
});

tape('valid match', function(t) {
    c.geocode('a1', { limit_verify:1, debug:4 }, function(err, res) {
        t.ifError(err);
        t.equal(res.features.length, 1);
        t.end();
    });
});

tape('no match', function(t) {
    c.geocode('b1', { limit_verify:1, debug:4 }, function(err, res) {
        t.ifError(err);
        t.equal(res.features.length, 0);
        t.end();
    });
});

tape('find collisions (coalesceSingle)', function(t) {
    var q = queue(1);
    for (var i = 1; i < 21; i++) {
        q.defer(function(j, callback) {
            var query = 'b' + j;
            c.geocode(query, { limit_verify:1, debug:4 }, function(err, res) {
                t.equal(res.features.length, 0, 'not in index')
                if (c.indexes.place._dictcache.has(termops.encodeTerm(query))) {
                    // this should collide
                    t.equal(res.collidingIndexes.length, 1, 'collides');
                } else {
                    // this should not collide
                    t.equal(res.collidingIndexes, undefined, 'does not collide');
                }
                callback();
            });
        }, i);
    }
    q.awaitAll(t.end);
});

tape('find collisions (coalesceMulti)', function(t) {
    var q = queue(1);
    for (var i = 1; i < 21; i++) {
        q.defer(function(j, callback) {
            var query = 'b' + j + ' x' + j;
            c.geocode(query, { limit_verify:1, debug:4 }, function(err, res) {
                t.equal(res.features.length, 0, 'not in index')
                if (c.indexes.place._dictcache.has(termops.encodeTerm(query))) {
                    // this should collide
                    t.equal(res.collidingIndexes.length, 1, 'collides');
                } else {
                    // this should not collide
                    t.equal(res.collidingIndexes, undefined, 'does not collide');
                }
                callback();
            });
        }, i);
    }
    q.awaitAll(t.end);
});

tape('index.teardown', function(assert) {
    index.teardown();
    context.getTile.cache.reset();
    assert.end();
});


