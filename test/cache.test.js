var Cache = require('../lib/util/cxxcache');
var test = require('tape');

test('.shard', function(s) {
    s.equal(Cache.shard('a'), '40311');
    s.equal(Cache.shard('b'), '44308');
    s.equal(Cache.shard('aa'), '22931');
    s.equal(Cache.shard('aaa'), '9307');

    s.equal(Cache.shard('aaaa'), '17249');
    s.equal(Cache.shard('aaab'), '29442');
    s.equal(Cache.shard('aaaaa'), '17249');
    s.equal(Cache.shard('aaaab'), '17249');
    s.equal(Cache.shard('aaaaaa'), '17249');
    s.equal(Cache.shard('aaaaab'), '17249');

    s.equal(Cache.shard(''), '65535');

    s.end();
});

test('#get', function(r) {
    var cache = new Cache('a');
    cache.set('grid', '5', [0,1,2]);
    r.deepEqual([0, 1, 2], cache.get('grid', '5'));
    r.throws(function() { cache.get('grid'); }, Error, 'throws on misuse');
    r.end();
});

test('#list', function(s) {
    var cache = new Cache('a');
    cache.set('grid', '5', [0,1,2]);
    s.deepEqual([34566], cache.list('grid'));
    s.end();
});

test('#has', function(s) {
    var cache = new Cache('a');
    cache.set('grid', '5', [0,1,2]);
    s.deepEqual(true, cache.has('grid', 34566));
    s.end();
});

test('#get', function(s) {
    var cache = new Cache('a');
    cache.set('grid', '5', [0,1,2]);
    s.deepEqual([0, 1, 2], cache._get('grid', 34566, '5'));
    s.deepEqual([0, 1, 2], cache.get('grid', '5'));
    s.equal(undefined, cache._get('grid', 5, '9'));
    s.end();
});

test('#pack', function(s) {
    var cache = new Cache('a');
    cache.set('grid', '5', [0,1,2]);
    s.deepEqual(2065, cache.pack('grid', 34566).length);
    // set should replace data
    cache.set('grid', '5', [0,1,2,4]);
    s.deepEqual(2066, cache.pack('grid', 34566).length);
    // throw on invalid grid
    s.throws(cache.set.bind(null, 'grid', '5', []), 'cache.set throws on empty grid value');
    // now test packing data created via load
    var packer = new Cache('a');
    var array = [];
    for (var i=0;i<10000;++i) {
        array.push(0);
    }
    packer.set('grid', '5', array);
    var loader = new Cache('a');
    loader.loadSync(packer.pack('grid',34566), 'grid', 34566);
    // grab data right back out
    s.deepEqual(12063, loader.pack('grid', 34566).length);
    // try to grab data that does not exist
    s.throws(function() { loader.pack('grid', 99999999999999) });
    s.end();
});

test('#load', function(s) {
    var cache = new Cache('a');
    s.equal('a', cache.id);

    s.equal(undefined, cache.get('grid', '5'));
    s.deepEqual([], cache.list('grid'));

    cache.set('grid', '5', [0,1,2]);
    s.deepEqual([0,1,2], cache.get('grid', '5'));
    s.deepEqual([ 34566 ], cache.list('grid'));

    cache.set('grid', '21', [5,6]);
    s.deepEqual([5,6], cache.get('grid', '21'));
    s.deepEqual([ 22666, 34566 ], cache.list('grid'), 'single shard');
    s.deepEqual(['5'], cache.list('grid', 34566), 'keys in shard');
    s.deepEqual(['21'], cache.list('grid', 22666), 'keys in shard');

    // cache A serializes data, cache B loads serialized data.
    var pack = cache.pack('grid', 22666);
    var loader = new Cache('b');
    loader.loadSync(pack, 'grid', 22666);
    s.deepEqual([6,5], loader.get('grid', '21'));
    s.deepEqual([22666], loader.list('grid'), 'single shard');
    s.deepEqual(['21'], loader.list('grid', 22666), 'keys in shard');
    s.end();
});

test('#unload on empty data', function(s) {
    var cache = new Cache('a');
    s.equal(false,cache.unload('grid', 34566));
    s.deepEqual(false, cache.has('grid', 34566));
    s.end();
});

test('#unload after set', function(s) {
    var cache = new Cache('a');
    cache.set('grid', '5', [0,1,2]);
    s.deepEqual(true, cache.has('grid', 34566));
    s.equal(true,cache.unload('grid',34566));
    s.deepEqual(false, cache.has('grid', 34566));
    s.end();
});

test('#unload after load', function(s) {
    var cache = new Cache('a');
    var array = [];
    for (var i=0;i<10000;++i) {
        array.push(0);
    }
    cache.set('grid', '5', array);
    var pack = cache.pack('grid', 34566);
    var loader = new Cache('b');
    loader.loadSync(pack, 'grid', 34566);
    s.deepEqual(array, loader.get('grid', '5'));
    s.deepEqual([34566], loader.list('grid'), 'single shard');
    s.deepEqual(true, loader.has('grid', 34566));
    s.equal(true,loader.unload('grid',34566));
    s.deepEqual(false, loader.has('grid', 34566));
    s.end();
});

test('#unloadall', function(s) {
    var cache = new Cache('a');
    var array = [];
    for (var i=0;i<10000;++i) {
        array.push(0);
    }
    cache.set('grid', '5', array);
    var pack = cache.pack('grid', 34566);

    var loader = new Cache('b');
    loader.loadSync(pack, 'grid', 0);
    loader.loadSync(pack, 'grid', 1);
    loader.loadSync(pack, 'grid', 2);
    loader.loadSync(pack, 'grid', 3);
    loader.loadSync(pack, 'grid', 4);
    loader.loadSync(pack, 'grid', 34566);
    s.deepEqual(array, loader.get('grid', '5'));
    s.deepEqual([0,1,2,3,34566,4], loader.list('grid'), 'many shards');
    s.deepEqual(true, loader.has('grid', 0));
    s.equal(true,loader.unloadall('grid'));
    s.deepEqual(false, loader.has('grid', 0));
    s.deepEqual([], loader.list('grid'), 'no shards');
    s.end();
});

test('#loadall', function(assert) {
    var cache = new Cache('a');
    cache.set('grid', '5', [0]);
    cache.set('grid', '21', [1]);

    var packs = {};
    packs[34566] = cache.pack('grid', 34566);
    packs[22666] = cache.pack('grid', 22666);

    function getter(type, shard, callback) {
        return callback(null, packs[shard]);
    }

    var loader = new Cache('b');
    assert.equal(loader.has('grid', 34566), false);
    assert.equal(loader.has('grid', 22666), false);
    load1();

    function load1() {
        loader.loadall(getter, 'grid', ['5','21'], function(err, shards, queue) {
            assert.ifError(err);
            assert.deepEqual(loader.get('grid', '5'), [0]);
            assert.deepEqual(loader.get('grid', '21'), [1]);
            load2();
        });
    }
    function load2() {
        loader.loadall(getter, 'grid', ['5','21'], function(err, shards, queue) {
            assert.ifError(err);
            assert.deepEqual(loader.get('grid', '5'), [0]);
            assert.deepEqual(loader.get('grid', '21'), [1]);
            get1();
        });
    }
    function get1() {
        loader.getall(getter, 'grid', ['5','21'], function(err, loaded) {
            assert.ifError(err);
            assert.deepEqual(loaded, [0,1]);
            get2();
        });
    }
    function get2() {
        loader.getall(getter, 'grid', ['5','21'], function(err, loaded) {
            assert.ifError(err);
            assert.deepEqual(loaded, [0,1]);
            assert.end();
        });
    }
});

