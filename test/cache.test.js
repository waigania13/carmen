var Cache = require('../cache');
var assert = require('assert');
var fs = require('fs');

describe('cache unit', function() {
    it('Cache.shard', function() {
        assert.equal(0, Cache.shard(0, 0));
        assert.equal(0, Cache.shard(0, 1), 'level0 => 0 shard for all ids');

        assert.equal(0, Cache.shard(1, 0));
        assert.equal(1, Cache.shard(1, 1));
        assert.equal(0, Cache.shard(1, 16));
    });
    it('Cache.shardsort', function() {
        var arr;

        arr = [0,1,2,3,4,5];
        Cache.shardsort(0, arr);
        assert.deepEqual([0,1,2,3,4,5], arr);

        arr = [0,1,16,2,17,3];
        Cache.shardsort(1, arr);
        assert.deepEqual([0,16,1,17,2,3], arr);
    });
    it('Cache.uniq', function() {
        assert.deepEqual([1,2,3,4,5], Cache.uniq([5,3,1,2,5,4,3,1,4,2]));
    });
    it('cache sync', function() {
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
});
