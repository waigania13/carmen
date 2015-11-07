var tape = require('tape');
var zlib = require('zlib');
var encodePhrase = require('../lib/util/termops').encodePhrase;
var Dictcache = require('../lib/util/dictcache');

tape('create (30 bit)', function(assert) {
    var dict = new Dictcache(null, 30);
    assert.equal(dict.cache.length, 134217728, 'created 128MiB cache');
    for (var i = 0; i < 134217728; i++) {
        if (dict.cache[i] !== 0) {
            assert.fail('buffer filled with 0s');
        }
    }
    assert.end();
});

tape('create (31 bit)', function(assert) {
    var dict = new Dictcache(null, 31);
    assert.equal(dict.cache.length, 268435456, 'created 256MiB cache');
    for (var i = 0; i < 268435456; i++) {
        if (dict.cache[i] !== 0) {
            assert.fail('buffer filled with 0s');
        }
    }
    assert.end();
});

tape('create (128 MiB buffer)', function(assert) {
    var dict = new Dictcache(new Buffer(134217728));
    assert.equal(dict.cache.length, 134217728, 'created 128MiB cache');
    assert.equal(dict.size, Math.pow(2,30), 'created 30 bitsize cache');
    assert.end();
});

tape('create (256 MiB buffer)', function(assert) {
    var dict = new Dictcache(new Buffer(268435456));
    assert.equal(dict.cache.length, 268435456, 'created 256MiB cache');
    assert.equal(dict.size, Math.pow(2,31), 'created 31 bitsize cache');
    assert.end();
});

tape('create (err: size)', function(assert) {
    assert.throws(function() {
        var dict = new Dictcache(null, 34);
    });
    assert.end();
});

tape('create (err: bufferlength)', function(assert) {
    assert.throws(function() {
        var dict = new Dictcache(new Buffer(50));
    });
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
        assert.ok(zdata.length < 200e3, 'gzipped dictcache < 200k');
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
    // del 0
    assert.equal(dict.del(0), undefined, 'del 0');
    assert.equal(dict.cache[0], 0, 'sets buffer[0] === 0');
    assert.equal(dict.has(0), false, 'has 0 = true');

    // initial state
    var last = dict.size - 1;
    assert.equal(dict.has(last), false);
    // set 0
    assert.equal(dict.set(last), undefined);
    assert.equal(dict.cache[dict.cache.length-1], 128, 'sets last byte === 128');
    assert.equal(dict.has(last), true);
    // del 0
    assert.equal(dict.del(last), undefined, 'del biggest');
    assert.equal(dict.cache[dict.cache.length-1], 0, 'sets last byte === 0');
    assert.equal(dict.has(last), false, 'has biggest = false');

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
    assert.end();
});

tape('auto', function(assert) {
    assert.equal(Dictcache.auto(1e5), 30, '100 thous => 30 bit');
    assert.equal(Dictcache.auto(1e6), 30, '1 million => 30 bit');
    assert.equal(Dictcache.auto(2e6), 31, '2 million => 31 bit');
    assert.equal(Dictcache.auto(100e6), 32, '100 million => 32 bit (capped at 32 bits)');
    assert.end();
});

// fuzz test
[10000, 100000, 1000000].forEach(function(ids) {
    var size = Dictcache.auto(ids);
    tape('fuzz auto: ' + ids + ' = ' + size, function(assert) {
        var dict = new Dictcache(null, size);
        var used = {};
        var count = 0;
        for (var i = 0; i < ids; i++) {
            var id = encodePhrase([Math.random().toString()]);
            if (dict.has(id) !== false) continue;
            if (dict.set(id) !== undefined) assert.fail('fuzz test set(): ' + id)
            if (dict.has(id) !== true) assert.fail('fuzz test post has(): ' + id)
            count++;
        }
        assert.ok(true, 'fuzz test x' + count);

        assert.end();
    });
});

// fuzz test
[32,30,28].forEach(function(bitSize) {
    tape('fuzz: ' + bitSize, function(assert) {
        var dict = new Dictcache(null, bitSize);
        var used = {};
        var count = 0;
        for (var i = 0; i < 100000; i++) {
            var id = encodePhrase([Math.random().toString()]);
            if (dict.has(id) !== false) continue;
            if (dict.set(id) !== undefined) assert.fail('fuzz test set(): ' + id)
            if (dict.has(id) !== true) assert.fail('fuzz test post has(): ' + id)
            count++;
        }
        assert.ok(true, 'fuzz test x' + count);

        assert.end();
    });
});

