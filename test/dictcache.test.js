var tape = require('tape');
var zlib = require('zlib');
var Dictcache = require('../lib/util/dictcache');

tape('create', function(assert) {
    var dict = new Dictcache();
    assert.equal(dict.cache.length, 33554432, 'created 32MB cache');
    for (var i = 0; i < 33554432; i++) {
        if (dict.cache[i] !== 0) {
            assert.fail('buffer filled with 0s');
        }
    }
    assert.end();
});

tape('dump/load', function(assert) {
    assert.throws(function() {
        var foo = new Dictcache(new Buffer(200));
    }, 'throws with bad length buffer');

    var dict = new Dictcache();
    dict.set(1);
    dict.set(2);
    dict.set(3);
    dict.set(4);

    zlib.gzip(dict.dump(), function(err, zdata) {
        assert.ifError(err);
        assert.ok(zdata.length < 40e3, 'gzipped dictcache < 40k');
        zlib.gunzip(zdata, function(err, data) {
            assert.ifError(err);
            var loaded = new Dictcache(data);
            assert.equal(dict.has(1), true, 'has 1');
            assert.equal(dict.has(2), true, 'has 2');
            assert.equal(dict.has(3), true, 'has 3');
            assert.equal(dict.has(4), true, 'has 4');
            assert.equal(dict.has(5), false, 'not 5');
            assert.end();
        });
    });
});

tape('set/has/del', function(assert) {
    var dict = new Dictcache();

    // initial state
    assert.equal(dict.has(0), false, 'has 0 = false');
    // set 0
    assert.equal(dict.set(0), undefined, 'set 0');
    assert.equal(dict.cache[0], 1, 'sets buffer[0] === 1');
    assert.equal(dict.has(0), true, 'has 0 = true');
    assert.equal(dict.has(268435456), true, 'truncates to 2^28');
    // del 0
    assert.equal(dict.del(0), undefined, 'del 0');
    assert.equal(dict.cache[0], 0, 'sets buffer[0] === 0');
    assert.equal(dict.has(0), false, 'has 0 = true');

    // initial state
    assert.equal(dict.has(268435455), false);
    // set 0
    assert.equal(dict.set(268435455), undefined);
    assert.equal(dict.cache[33554431], 128, 'sets buffer[33554431] === 128');
    assert.equal(dict.has(268435455), true);
    // del 0
    assert.equal(dict.del(268435455), undefined, 'del 268435455');
    assert.equal(dict.cache[33554431], 0, 'sets buffer[33554431] === 0');
    assert.equal(dict.has(268435455), false, 'has 268435455 = false');

    // test within byte bounds
    for (var id = 0; id < 8; id++) {
        assert.equal(dict.has(id), false, 'has ' + id + ' = false');
        assert.equal(dict.set(id), undefined, 'set ' + id);
        assert.equal(dict.has(id), true, 'has ' + id + ' = true');
    }
    for (var id = 0; id < 8; id++) {
        assert.equal(dict.del(id), undefined, 'del ' + id);
        assert.equal(dict.has(id), false, 'has ' + id + ' = false');
    }

    // fuzz test
    var used = {};
    var count = 0;
    for (var i = 0; i < 10000; i++) {
        var id = Math.floor(Math.random() * Math.pow(2,51)) + Math.floor(Math.random() * Math.pow(2,8));
        if (used[id%Math.pow(2,28)]) continue;
        count++;
        used[id%Math.pow(2,28)] = true;
        if (dict.has(id) !== false) assert.fail('fuzz test pre has(): ' + id)
        if (dict.set(id) !== undefined) assert.fail('fuzz test set(): ' + id)
        if (dict.has(id) !== true) assert.fail('fuzz test post has(): ' + id)
    }
    assert.ok(true, 'fuzz test x' + count);

    assert.end();
});


