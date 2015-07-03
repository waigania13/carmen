var Cache = require('../lib/util/cxxcache');
var fs = require('fs');
var test = require('tape');

test('.shard', function(s) {
    s.equal(0, Cache.shard(0, 0));
    s.equal(0, Cache.shard(0, 1), 'level0 => 0 shard for all ids');

    s.equal(0, Cache.shard(1, 0));
    s.equal(0, Cache.shard(1, 1));
    s.equal(3, Cache.shard(1, Cache.mp[28] * 3));
    s.equal(3, Cache.shard(1, Cache.mp[28] * 3 + 5), 'lower bits do not affect shard');
    s.equal(15, Cache.shard(1, Cache.mp[28] * 15));
    s.equal(3, Cache.shard(2, Cache.mp[24] * 3));
    s.equal(15, Cache.shard(2, Cache.mp[24] * 15));
    s.equal(false, Cache.shard(1));
    s.end();
});

test('#get', function(r) {
    var cache = new Cache('a', 1);
    cache.set('term', 5, [0,1,2]);
    r.deepEqual([0, 1, 2], cache.get('term', 5));
    r.throws(function() { cache.get('term'); }, Error, 'throws on misuse');
    r.end();
});

test('#list', function(s) {
    var cache = new Cache('a', 1);
    cache.set('term', 5, [0,1,2]);
    s.deepEqual([0], cache.list('term'));
    s.end();
});

test('#has', function(s) {
    var cache = new Cache('a', 1);
    cache.set('term', 5, [0,1,2]);
    s.deepEqual(true, cache.has('term', 0));
    s.end();
});

test('#get', function(s) {
    var cache = new Cache('a', 1);
    cache.set('term', 5, [0,1,2]);
    s.deepEqual([0, 1, 2], cache._get('term', 0, 5));
    s.deepEqual([0, 1, 2], cache.get('term', 5));
    s.equal(undefined, cache._get('term', 5, 9));
    s.end();
});

test('#pack', function(s) {
    var cache = new Cache('a', 1);
    cache.set('term', 5, [0,1,2]);
    s.deepEqual(9, cache.pack('term', 0).length);
    // set should replace data
    cache.set('term', 5, [0,1,2,4]);
    s.deepEqual(10, cache.pack('term', 0).length);
    cache.set('term', 5, []);
    s.deepEqual(4, cache.pack('term', 0).length);
    // now test packing data created via load
    var packer = new Cache('a', 1);
    var array = [];
    for (var i=0;i<10000;++i) {
        array.push(0);
    }
    packer.set('term', 5, array);
    var loader = new Cache('a', 1);
    loader.load(packer.pack('term',0), 'term', 0);
    // grab data right back out
    s.deepEqual(10008, loader.pack('term', 0).length);
    // try to grab data that does not exist
    s.throws(function() { loader.pack('term', 99999999999999) });
    s.end();
});

test('#load', function(s) {
    var cache = new Cache('a', 1);
    s.equal('a', cache.id);
    s.equal(1, cache.shardlevel);

    s.equal(undefined, cache.get('term', 5));
    s.deepEqual([], cache.list('term'));

    cache.set('term', 5, [0,1,2]);
    s.deepEqual([0,1,2], cache.get('term', 5));
    s.deepEqual([0], cache.list('term'));

    cache.set('term', 21, [5,6]);
    s.deepEqual([5,6], cache.get('term', 21));
    s.deepEqual([0], cache.list('term'), 'single shard');
    s.deepEqual(['5', '21'], cache.list('term', 0), 'keys in shard');

    // cache A serializes data, cache B loads serialized data.
    var pack = cache.pack('term', 0);
    var loader = new Cache('b', 1);
    loader.load(pack, 'term', 0);
    s.deepEqual([5,6], loader.get('term', 21));
    s.deepEqual([0], loader.list('term'), 'single shard');
    s.deepEqual(['5', '21'], loader.list('term', 0), 'keys in shard');
    s.end();
});

test('#load (async)', function(s) {
    var cache = new Cache('a', 1);
    var array = [];
    for (var i=0;i<10000;++i) {
        array.push(0);
    }
    cache.set('term', 0, array);
    var pack = cache.pack('term', 0);
    var loader = new Cache('b', 1);
    // multiple inserts to ensure we are thread safe
    loader.load(pack, 'term', 0,function(err) {
        s.deepEqual(array, loader.get('term', 0));
        s.deepEqual([0], loader.list('term'), 'single shard');
    });
    loader.load(pack, 'term', 0,function(err) {
        s.deepEqual(array, loader.get('term', 0));
        s.deepEqual([0], loader.list('term'), 'single shard');
    });
    loader.load(pack, 'term', 0,function(err) {
        s.deepEqual(array, loader.get('term', 0));
        s.deepEqual([0], loader.list('term'), 'single shard');
    });
    loader.load(pack, 'term', 0,function(err) {
        s.deepEqual(array, loader.get('term', 0));
        s.deepEqual([0], loader.list('term'), 'single shard');
    });
    loader.load(pack, 'term', 0,function(err) {
        s.deepEqual(array, loader.get('term', 0));
        s.deepEqual([0], loader.list('term'), 'single shard');
    });
    loader.load(pack, 'term', 0,function(err) {
        s.deepEqual(array, loader.get('term', 0));
        s.deepEqual([0], loader.list('term'), 'single shard');
    });
    loader.load(pack, 'term', 0,function(err) {
        s.deepEqual(array, loader.get('term', 0));
        s.deepEqual([0], loader.list('term'), 'single shard');
        s.end();
    });
});

test('#unload on empty data', function(s) {
    var cache = new Cache('a', 1);
    s.equal(false,cache.unload('term',5));
    s.deepEqual(false, cache.has('term', 5));
    s.end();
});

test('#unload after set', function(s) {
    var cache = new Cache('a', 1);
    cache.set('term', 0, [0,1,2]);
    s.deepEqual(true, cache.has('term', 0));
    s.equal(true,cache.unload('term',0));
    s.deepEqual(false, cache.has('term', 0));
    s.end();
});

test('#unload after load', function(s) {
    var cache = new Cache('a', 1);
    var array = [];
    for (var i=0;i<10000;++i) {
        array.push(0);
    }
    cache.set('term', 5, array);
    var pack = cache.pack('term', 0);
    var loader = new Cache('b', 1);
    loader.load(pack, 'term', 0);
    s.deepEqual(array, loader.get('term', 5));
    s.deepEqual([0], loader.list('term'), 'single shard');
    s.deepEqual(true, loader.has('term', 0));
    s.equal(true,loader.unload('term',0));
    s.deepEqual(false, loader.has('term', 0));
    s.end();
});

test('#unloadall', function(s) {
    var cache = new Cache('a', 1);
    var array = [];
    for (var i=0;i<10000;++i) {
        array.push(0);
    }
    cache.set('term', 5, array);
    var pack = cache.pack('term', 0);

    var loader = new Cache('b', 1);
    loader.load(pack, 'term', 0);
    loader.load(pack, 'term', 1);
    loader.load(pack, 'term', 2);
    loader.load(pack, 'term', 3);
    loader.load(pack, 'term', 4);
    s.deepEqual(array, loader.get('term', 5));
    s.deepEqual([0,1,2,3,4], loader.list('term'), 'many shards');
    s.deepEqual(true, loader.has('term', 0));
    s.equal(true,loader.unloadall('term'));
    s.deepEqual(false, loader.has('term', 0));
    s.deepEqual([], loader.list('term'), 'no shards');
    s.end();
});

test('#loadall', function(assert) {
    var cache = new Cache('a', 1);
    cache.set('grid', 1, [0]);
    cache.set('grid', Math.pow(2,28), [1]);

    var packs = [];
    packs[0] = cache.pack('grid', 0);
    packs[1] = cache.pack('grid', 1);

    function getter(type, shard, callback) {
        return callback(null, packs[shard]);
    }

    var loader = new Cache('b', 1);
    assert.equal(loader.has('grid', 0), false);
    assert.equal(loader.has('grid', 1), false);
    load1();

    function load1() {
        loader.loadall(getter, 'grid', [1,Math.pow(2,28)], function(err, shards, queue) {
            assert.ifError(err);
            assert.deepEqual(loader.get('grid', 1), [0]);
            assert.deepEqual(loader.get('grid', Math.pow(2,28)), [1]);
            load2();
        });
    }
    function load2() {
        loader.loadall(getter, 'grid', [1,Math.pow(2,28)], function(err, shards, queue) {
            assert.ifError(err);
            assert.deepEqual(loader.get('grid', 1), [0]);
            assert.deepEqual(loader.get('grid', Math.pow(2,28)), [1]);
            get1();
        });
    }
    function get1() {
        loader.getall(getter, 'grid', [1,Math.pow(2,28)], function(err, loaded) {
            assert.ifError(err);
            assert.deepEqual(loaded, [1,0]);
            get2();
        });
    }
    function get2() {
        loader.getall(getter, 'grid', [1,Math.pow(2,28)], function(err, loaded) {
            assert.ifError(err);
            assert.deepEqual(loaded, [1,0]);
            assert.end();
        });
    }
});

