var Cache = require('../lib/util/cxxcache');
var assert = require('assert');
var fs = require('fs');

describe('Cache', function() {
    describe('cache unit', function() {
        describe('class functions', function() {
            it('.shard', function() {
                assert.equal(0, Cache.shard(0, 0));
                assert.equal(0, Cache.shard(0, 1), 'level0 => 0 shard for all ids');

                assert.equal(0, Cache.shard(1, 0));
                assert.equal(0, Cache.shard(1, 1));
                assert.equal(3, Cache.shard(1, Cache.mp[28] * 3));
                assert.equal(3, Cache.shard(1, Cache.mp[28] * 3 + 5), 'lower bits do not affect shard');
                assert.equal(15, Cache.shard(1, Cache.mp[28] * 15));
                assert.equal(3, Cache.shard(2, Cache.mp[24] * 3));
                assert.equal(15, Cache.shard(2, Cache.mp[24] * 15));
                assert.equal(false, Cache.shard(1));
            });

            it('.shardsort', function() {
                var arr;

                arr = [0,1,2,3,4,5];
                Cache.shardsort(0, arr);
                assert.deepEqual([0,1,2,3,4,5], arr);

                arr = [0,1,Cache.mp[24],2,Cache.mp[23],3];
                Cache.shardsort(1, arr);
                assert.deepEqual([0,1,2,3,Cache.mp[23],Cache.mp[24]], arr);
            });

            it('.uniq', function() {
                assert.deepEqual([1,2,3,4,5], Cache.uniq([5,3,1,2,5,4,3,1,4,2]));
            });
        });

        it('#get', function() {
            var cache = new Cache('a', 1);
            cache.set('term', 5, [0,1,2]);
            assert.deepEqual([0, 1, 2], cache.get('term', 5));
            assert.equal(undefined, cache.get('term'));
        });

        describe('c++ functions', function() {
            it('#list', function() {
                var cache = new Cache('a', 1);
                cache.set('term', 5, [0,1,2]);
                assert.deepEqual([0], cache.list('term'));
            });

            it('#has', function() {
                var cache = new Cache('a', 1);
                cache.set('term', 5, [0,1,2]);
                assert.deepEqual(true, cache.has('term', 0));
            });

            it('#get', function() {
                var cache = new Cache('a', 1);
                cache.set('term', 5, [0,1,2]);
                assert.deepEqual([0, 1, 2], cache._get('term', 0, 5));
                assert.deepEqual([0, 1, 2], cache.get('term', 5));
                assert.equal(undefined, cache._get('term', 5, 9));
            });

            it('#pack', function() {
                var cache = new Cache('a', 1);
                cache.set('term', 5, [0,1,2]);
                assert.deepEqual(9, cache.pack('term', 0).length);
                // set should replace data
                cache.set('term', 5, [0,1,2,4]);
                assert.deepEqual(10, cache.pack('term', 0).length);
                cache.set('term', 5, []);
                assert.deepEqual(4, cache.pack('term', 0).length);
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
                assert.deepEqual(10008, loader.pack('term', 0).length);
                // try to grab data that does not exist
                assert.throws(function() { loader.pack('term', 99999999999999) });
            });

            it('#load', function() {
                var cache = new Cache('a', 1);
                assert.equal('a', cache.id);
                assert.equal(1, cache.shardlevel);

                assert.equal(undefined, cache.get('term', 5));
                assert.deepEqual([], cache.list('term'));

                cache.set('term', 5, [0,1,2]);
                assert.deepEqual([0,1,2], cache.get('term', 5));
                assert.deepEqual([0], cache.list('term'));

                cache.set('term', 21, [5,6]);
                assert.deepEqual([5,6], cache.get('term', 21));
                assert.deepEqual([0], cache.list('term'), 'single shard');
                assert.deepEqual([5, 21], cache.list('term', 0), 'keys in shard');

                // cache A serializes data, cache B loads serialized data.
                var pack = cache.pack('term', 0);
                var loader = new Cache('b', 1);
                loader.load(pack, 'term', 0);
                assert.deepEqual([5,6], loader.get('term', 21));
                assert.deepEqual([0], loader.list('term'), 'single shard');
                assert.deepEqual([5, 21], loader.list('term', 0), 'keys in shard');
            });

            it('#load (async)', function(done) {
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
                    assert.deepEqual(array, loader.get('term', 0));
                    assert.deepEqual([0], loader.list('term'), 'single shard');
                });
                loader.load(pack, 'term', 0,function(err) {
                    assert.deepEqual(array, loader.get('term', 0));
                    assert.deepEqual([0], loader.list('term'), 'single shard');
                });
                loader.load(pack, 'term', 0,function(err) {
                    assert.deepEqual(array, loader.get('term', 0));
                    assert.deepEqual([0], loader.list('term'), 'single shard');
                });
                loader.load(pack, 'term', 0,function(err) {
                    assert.deepEqual(array, loader.get('term', 0));
                    assert.deepEqual([0], loader.list('term'), 'single shard');
                });
                loader.load(pack, 'term', 0,function(err) {
                    assert.deepEqual(array, loader.get('term', 0));
                    assert.deepEqual([0], loader.list('term'), 'single shard');
                });
                loader.load(pack, 'term', 0,function(err) {
                    assert.deepEqual(array, loader.get('term', 0));
                    assert.deepEqual([0], loader.list('term'), 'single shard');
                });
                loader.load(pack, 'term', 0,function(err) {
                    assert.deepEqual(array, loader.get('term', 0));
                    assert.deepEqual([0], loader.list('term'), 'single shard');
                    done();
                });
            });

            it('#unload on empty data', function() {
                var cache = new Cache('a', 1);
                assert.equal(false,cache.unload('term',5));
                assert.deepEqual(false, cache.has('term', 5));
            });

            it('#unload after set', function() {
                var cache = new Cache('a', 1);
                cache.set('term', 0, [0,1,2]);
                assert.deepEqual(true, cache.has('term', 0));
                assert.equal(true,cache.unload('term',0));
                assert.deepEqual(false, cache.has('term', 0));
            });

            it('#unload after load', function() {
                var cache = new Cache('a', 1);
                var array = [];
                for (var i=0;i<10000;++i) {
                    array.push(0);
                }
                cache.set('term', 5, array);
                var pack = cache.pack('term', 0);
                var loader = new Cache('b', 1);
                loader.load(pack, 'term', 0);
                assert.deepEqual(array, loader.get('term', 5));
                assert.deepEqual([0], loader.list('term'), 'single shard');
                assert.deepEqual(true, loader.has('term', 0));
                assert.equal(true,loader.unload('term',0));
                assert.deepEqual(false, loader.has('term', 0));
            });

            it('#unloadall', function() {
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
                assert.deepEqual(array, loader.get('term', 5));
                assert.deepEqual([0,1,2,3,4], loader.list('term'), 'many shards');
                assert.deepEqual(true, loader.has('term', 0));
                assert.equal(true,loader.unloadall('term'));
                assert.deepEqual(false, loader.has('term', 0));
                assert.deepEqual([], loader.list('term'), 'no shards');
            });

        });
    });

    describe('#getall', function() {
        var Memsource = require('../api-mem');
        var mem = new Memsource({}, function() {});
        var docs = require('./fixtures/docs.json');
        var index = require('../lib/index');
        var stats = { term:0, phrase:0 };
        var cache = new Cache('a', 1);

        mem._geocoder = cache;

        before(function(done) {
            index.update(mem, docs, function(err) {
                if (err) return done(err);
                index.store(mem, function(err) {
                    if (err) return done(err);
                    mem._geocoder.unloadall('term');
                    mem._geocoder.unloadall('phrase');
                    done();
                });
            });
        });

        function getter(type, shard, callback) {
            stats[type]++;
            mem.getGeocoderData(type, shard, callback);
        }

        it('term', function(done) {
            var ids = [
                238637120, // shard0
                474088544, // shard1
                268231120, // shard0
                546393072, // shard2
                515671616, // shard1
            ];
            var check = function(err, result) {
                assert.ifError(err);

                // Returns ids mapped to input ids.
                result.sort();
                assert.deepEqual([238233187,267425555,474088545,515671625,546393074], result);

                // Has loaded shards into cache -- other ids in same shards
                // can be retrieved without additional IO.
                assert.deepEqual([4835448], cache.get('term', 4835440), 'shard 0 in memory');
                assert.deepEqual([283379720], cache.get('term', 284048608), 'shard 1 in memory');

                // Check IO counter.
                assert.equal(3, stats.term);
            };
            // x2 runs and check ensures that
            // - IO does not occur beyond first run.
            // - result is identical with/without IO.
            cache.getall(getter, 'term', ids, function(err, result) {
                check(err, result);
                cache.getall(getter, 'term', ids, function(err, result) {
                    check(err, result);
                    done();
                });
            });
        });

        it('term empty', function(done) {
            cache.getall(getter, 'term', [556780291], function(err, result) {
                assert.deepEqual([], result);
                done();
            });
        });

        it('phrase', function(done) {
            var ids = [
                733221362, // shard2
                4835448,   // shard0
                619528441, // shard2
                579414696, // shard2
                184073316, // shard0
            ];
            var check = function(err, result) {
                assert.ifError(err);

                // Returns ids mapped to input ids.
                result.sort();
                assert.deepEqual([184073327,4835455,733221375], result);

                // Has loaded shards into cache -- other ids in same shards
                // can be retrieved without additional IO.
                assert.deepEqual([ 7592655 ], cache.get('phrase', 7592655), 'shard 0 in memory');
                assert.deepEqual([ 546393087 ], cache.get('phrase', 546393074), 'shard 2 in memory');

                // Check IO counter.
                assert.equal(2, stats.phrase);
            };

            // x2 runs and check ensures that
            // - IO does not occur beyond first run.
            // - result is identical with/without IO.
            cache.getall(getter, 'phrase', ids, function(err, result) {
                check(err, result);
                cache.getall(getter, 'phrase', ids, function(err, result) {
                    check(err, result);
                    done();
                });
            });
        });
    });
});
