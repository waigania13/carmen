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
                assert.equal(1, Cache.shard(1, 1));
                assert.equal(0, Cache.shard(1, 16));
                assert.equal(false, Cache.shard(1));
            });

            it('.shardsort', function() {
                var arr;

                arr = [0,1,2,3,4,5];
                Cache.shardsort(0, arr);
                assert.deepEqual([0,1,2,3,4,5], arr);

                arr = [0,1,16,2,17,3];
                Cache.shardsort(1, arr);
                assert.deepEqual([0,16,1,17,2,3], arr);
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
                assert.deepEqual([5], cache.list('term'));
            });

            it('#has', function() {
                var cache = new Cache('a', 1);
                cache.set('term', 5, [0,1,2]);
                assert.deepEqual(true, cache.has('term', 5));
            });

            it('#search', function() {
                var cache = new Cache('a', 1);
                cache.set('term', 5, [0,1,2]);
                assert.deepEqual([0, 1, 2], cache.search('term', 5, 5));
                assert.equal(undefined, cache.search('term', 5, 9));
            });

            it('#pack', function() {
                var cache = new Cache('a', 1);
                cache.set('term', 5, [0,1,2]);
                assert.deepEqual(9, cache.pack('term', 5, 'protobuf').length);
            });

            it('#load', function() {
                var cache = new Cache('a', 1);
                assert.equal('a', cache.id);
                assert.equal(1, cache.shardlevel);

                assert.equal(undefined, cache.get('term', 5));
                assert.deepEqual([], cache.list('term'));

                cache.set('term', 5, [0,1,2]);
                assert.deepEqual([0,1,2], cache.get('term', 5));
                assert.deepEqual([5], cache.list('term'));

                cache.set('term', 21, [5,6]);
                assert.deepEqual([5,6], cache.get('term', 21));
                assert.deepEqual([5], cache.list('term'), 'single shard');
                assert.deepEqual([5, 21], cache.list('term', 5), 'keys in shard');

                // cache A serializes data, cache B loads serialized data.
                var pack = cache.pack('term', 5);
                var loader = new Cache('b', 1);
                loader.load(pack, 'term', 5);
                assert.deepEqual([5,6], loader.get('term', 21));
                assert.deepEqual([5], loader.list('term'), 'single shard');
                assert.deepEqual([5, 21], loader.list('term', 5), 'keys in shard');
            });

            it('#load (async)', function(done) {
                var cache = new Cache('a', 1);
                var array = [];
                for (var i=0;i<10000;++i) {
                    array.push(0);
                }
                cache.set('term', 5, array);
                var pack = cache.pack('term', 5);
                var loader = new Cache('b', 1);
                // multiple inserts to ensure we are thread safe
                loader.load(pack, 'term', 5,function(err) {
                    assert.deepEqual(array, loader.get('term', 5));
                    assert.deepEqual([5], loader.list('term'), 'single shard');
                });
                loader.load(pack, 'term', 5,function(err) {
                    assert.deepEqual(array, loader.get('term', 5));
                    assert.deepEqual([5], loader.list('term'), 'single shard');
                });
                loader.load(pack, 'term', 5,function(err) {
                    assert.deepEqual(array, loader.get('term', 5));
                    assert.deepEqual([5], loader.list('term'), 'single shard');
                });
                loader.load(pack, 'term', 5,function(err) {
                    assert.deepEqual(array, loader.get('term', 5));
                    assert.deepEqual([5], loader.list('term'), 'single shard');
                });
                loader.load(pack, 'term', 5,function(err) {
                    assert.deepEqual(array, loader.get('term', 5));
                    assert.deepEqual([5], loader.list('term'), 'single shard');
                });
                loader.load(pack, 'term', 5,function(err) {
                    assert.deepEqual(array, loader.get('term', 5));
                    assert.deepEqual([5], loader.list('term'), 'single shard');
                });
                loader.load(pack, 'term', 5,function(err) {
                    assert.deepEqual(array, loader.get('term', 5));
                    assert.deepEqual([5], loader.list('term'), 'single shard');
                    done();
                });
            });
        });
    });

    describe('#getall', function() {

        function getter(type, shard, callback) {
            stats[type]++;
            fs.readFile(__dirname + '/fixtures/' + type + '.' + shard + '.pbf', callback);
        }

        var stats = { term:0, grid:0 };
        var cache = new Cache('a', 2);

        it('term', function(done) {
            var ids = [
                872807937, // shard1
                462467840, // shard0
                283479809, // shard1
                986137856, // shard0
                450992896, // shard0
                556780290, // shard2
            ];
            var check = function(err, result) {
                assert.ifError(err);

                // Returns ids mapped to input ids.
                result.sort();
                assert.deepEqual([
                    126117647032898,
                    18578132799233,
                    2245607251996,
                    247567914995457,
                    251957525165442,
                    30308292408064,
                    57200341024257,
                    64627530548480
                ], result);

                // Has loaded shards into cache -- other ids in same shards
                // can be retrieved without additional IO.
                assert.deepEqual([105151062623251,38786692070144], cache.get('term', 591837952), 'shard 0 in memory');
                assert.deepEqual([44433332596993], cache.get('term', 677998849), 'shard 1 in memory');

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

        it('term err', function(done) {
            cache.getall(getter, 'term', [556780291], function(err, result) {
                assert.ok(err);
                assert.equal('ENOENT', err.code);
                done();
            });
        });

        it('grid', function(done) {
            var ids = [
                52712469173248, // 0
                3504240518402, // 2,
                98071753006080, // 0
                141956873251072, // 0
                35554947385346, // 2
            ];
            var check = function(err, result) {
                assert.ifError(err);

                // Returns ids mapped to input ids.
                result.sort();
                assert.deepEqual([
                    186940699735014,
                    267755911658816,
                    267758562448752,
                    276002785732597,
                    280400899352565,
                    294145365125876,
                    294145398680308,
                    328778739895470,
                    343622281069633,
                    344172003329089,
                    344172036883521,
                    571769031339059,
                    599253667911333,
                    608600389166031
                ], result);

                // Has loaded shards into cache -- other ids in same shards
                // can be retrieved without additional IO.
                assert.equal(102901, cache.get('grid', 229811356881664)[0] % Math.pow(2,25), 'grid ID check');
                assert.equal(100453, cache.get('grid', 67003285138178)[0] % Math.pow(2,25), 'grid ID check');
                assert.deepEqual([ 593756243988981, 593756277543413 ], cache.get('grid', 229811356881664), 'shard 0 in memory');
                assert.deepEqual([ 623996739618917 ], cache.get('grid', 67003285138178), 'shard 2 in memory');

                // Check IO counter.
                assert.equal(2, stats.grid);
            };

            // x2 runs and check ensures that
            // - IO does not occur beyond first run.
            // - result is identical with/without IO.
            cache.getall(getter, 'grid', ids, function(err, result) {
                check(err, result);
                cache.getall(getter, 'grid', ids, function(err, result) {
                    check(err, result);
                    done();
                });
            });
        });
    });
});
