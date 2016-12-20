var Cache = require('../lib/util/cxxcache');
var test = require('tape');
var fs = require('fs');

var tmpdir = require('os').tmpdir() + "/temp." + Math.random().toString(36).substr(2, 5);
fs.mkdirSync(tmpdir);
var tmpidx = 0;
var tmpfile = function() { return tmpdir + "/" + (tmpidx++) + ".dat"; };

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
    s.deepEqual(['5'], cache.list('grid'));
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
    s.deepEqual([0, 1, 2], cache.get('grid', '5'));
    s.equal(undefined, cache._get('grid', '9'));
    s.end();
});

test('#pack', function(s) {
    var cache = new Cache('a');
    cache.set('grid', '5', [0,1,2]);
    //s.deepEqual(2065, cache.pack('grid', 34566).length);
    // set should replace data
    cache.set('grid', '5', [0,1,2,4]);
    //s.deepEqual(2066, cache.pack('grid', 34566).length);
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
    var packed = tmpfile();
    packer.pack(packed, 'grid');
    loader.loadSync(packed, 'grid');
    // grab data right back out
    //s.deepEqual(12063, loader.pack('grid', 34566).length);
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
    s.deepEqual([ '5' ], cache.list('grid'));

    cache.set('grid', '21', [5,6]);
    s.deepEqual([5,6], cache.get('grid', '21'));
    s.deepEqual([ '21', '5' ], cache.list('grid'), 'keys in cache');

    // cache A serializes data, cache B loads serialized data.
    var pack = tmpfile();
    cache.pack(pack, 'grid');
    var loader = new Cache('b');
    loader.loadSync(pack, 'grid');
    s.deepEqual([6,5], loader.get('grid', '21'));
    s.deepEqual([ '21', '5'], loader.list('grid'), 'keys in cache');
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
    s.deepEqual(true, cache.has('grid'));
    s.equal(true,cache.unload('grid'));
    s.deepEqual(false, cache.has('grid'));
    s.end();
});

test('#unload after load', function(s) {
    var cache = new Cache('a');
    var array = [];
    for (var i=0;i<10000;++i) {
        array.push(0);
    }
    cache.set('grid', '5', array);
    var pack = tmpfile();
    cache.pack(pack, 'grid');
    var loader = new Cache('b');
    loader.loadSync(pack, 'grid');
    s.deepEqual(array, loader.get('grid', '5'));
    s.deepEqual(['5'], loader.list('grid'), 'single key');
    s.deepEqual(true, loader.has('grid'));
    s.equal(true,loader.unload('grid'));
    s.deepEqual(false, loader.has('grid'));
    s.end();
});

test('#unload', function(s) {
    var cache = new Cache('a');
    var array = [];
    for (var i=0;i<10000;++i) {
        array.push(0);
    }
    cache.set('grid', '5', array);
    var pack = tmpfile();
    cache.pack(pack, 'grid');

    var loader = new Cache('b');
    loader.loadSync(pack, 'grid');
    s.deepEqual(array, loader.get('grid', '5'));
    s.deepEqual(['5'], loader.list('grid'), 'many shards');
    s.deepEqual(true, loader.has('grid'));
    s.equal(true,loader.unload('grid'));
    s.deepEqual(false, loader.has('grid'));
    s.deepEqual([], loader.list('grid'), 'no keys');
    s.end();
});

