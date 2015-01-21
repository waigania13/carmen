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

test('.shardsort', function(s) {
    var arr;

    arr = [0,1,2,3,4,5];
    Cache.shardsort(0, arr);
    s.deepEqual([0,1,2,3,4,5], arr);

    arr = [0,1,Cache.mp[24],2,Cache.mp[23],3];
    Cache.shardsort(1, arr);
    s.deepEqual([0,1,2,3,Cache.mp[23],Cache.mp[24]], arr);
    s.end();
});

test('.uniq', function(s) {
    s.deepEqual([1,2,3,4,5], Cache.uniq([5,3,1,2,5,4,3,1,4,2]));
    s.end();
});

test('#get', function(r) {
    var cache = new Cache('a', 1);
    cache.set('term', 5, [0,1,2]);
    r.deepEqual([0, 1, 2], cache.get('term', 5));
    r.equal(undefined, cache.get('term'));
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

(function() {

var Memsource = require('../lib/api-mem');
var mem = new Memsource({}, function() {});
var docs = require('./fixtures/docs.json');
var index = require('../lib/index');
var stats = { term:0, phrase:0 };
var cache = new Cache('a', 1);
var zoom = 6;
mem._geocoder = cache;
mem._geocoder.geocoder_tokens = {};

function getter(type, shard, callback) {
    stats[type]++;
    mem.getGeocoderData(type, shard, callback);
}

test('#getall setup', function(q) {
    index.update(mem, docs, zoom, function(err) {
        q.ifError(err);
        index.store(mem, q.end);
    });
});

test('term', function(r) {
    var ids = [
        238637120, // shard0
        474088544, // shard1
        268231120, // shard0
        546393072, // shard2
        515671616, // shard1
    ];
    var check = function(err, result) {
        r.ifError(err);

        // Returns ids mapped to input ids.
        result.sort();
        r.deepEqual([238233187,267425555,474088545,515671625,546393074], result);

        // Has loaded shards into cache -- other ids in same shards
        // can be retrieved without additional IO.
        r.deepEqual([4835448], cache.get('term', 4835440), 'shard 0 in memory');
        r.deepEqual([283379720], cache.get('term', 284048608), 'shard 1 in memory');

        // Check IO counter.
        r.equal(3, stats.term);
    };
    // x2 runs and check ensures that
    // - IO does not occur beyond first run.
    // - result is identical with/without IO.
    cache.getall(getter, 'term', ids, function(err, result) {
        check(err, result);
        cache.getall(getter, 'term', ids, function(err, result) {
            check(err, result);
            r.end();
        });
    });
});

test('term empty', function(r) {
    cache.getall(getter, 'term', [556780291], function(err, result) {
        r.deepEqual([], result);
        r.end();
    });
});

test('phrase', function(r) {
    var ids = [
        733221362, // shard2
        4835448,   // shard0
        619528441, // shard2
        579414696, // shard2
        184073316, // shard0
    ];
    var check = function(err, result) {
        r.ifError(err);

        // Returns ids mapped to input ids.
        result.sort();
        r.deepEqual([184073327,4835455,733221375], result);

        // Has loaded shards into cache -- other ids in same shards
        // can be retrieved without additional IO.
        r.deepEqual([ 7592655 ], cache.get('phrase', 7592655), 'shard 0 in memory');
        r.deepEqual([ 546393087 ], cache.get('phrase', 546393074), 'shard 2 in memory');

        // Check IO counter.
        r.equal(2, stats.phrase);
    };

    // x2 runs and check ensures that
    // - IO does not occur beyond first run.
    // - result is identical with/without IO.
    cache.getall(getter, 'phrase', ids, function(err, result) {
        check(err, result);
        cache.getall(getter, 'phrase', ids, function(err, result) {
            check(err, result);
            r.end();
        });
    });
});

test('index.teardown', function(assert) {
    index.teardown();
    assert.end();
});

})();

