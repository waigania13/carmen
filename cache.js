module.exports = Cache;

function Cache(id, shardlevel) {
    this.id = id;
    this.shardlevel = shardlevel;

    // Caches.
    // Each cache contains an integer key => array of ints mapping *except*
    // grid. Grid contains integer key => array of arrays of ints. e.g.
    //
    // term = {
    //   1: [0,1,2,3],
    //   2: [0,1]
    //   ...
    // }
    //
    // grid = {
    //   1: [[0,1,2], [2,3,4]],
    //   2: [[0,1,2], [2,3,4]],
    //   ...
    // }
    this.grid = {};
    this.freq = {};
    this.term = {};
    this.phrase = {};
};

// For a given type retrieve all ids mapped to the passed set.
// This method sorts the input set of ids by shardlevel making it possible to
// make as few IO/function calls for the getter as possible.
//
// - getter, function passed in by caller that can do IO to retrieve the data
//   in question. Examples: MBTiles.getCarmen, S3.getCarmen.
// - type, one of grid/freq/term/phrase, maybe more in the future.
// - ids, array of integer ids.
// - callback, to be called on completion.
Cache.prototype.getall = function(getter, type, ids, callback) {
    var shardlevel = this.shardlevel;
    var cache = this;
    var queue = ids.slice(0);
    Cache.shardsort(shardlevel, queue);

    var result = [];
    (function lazyload() {
        // Queue fully loaded.
        if (!queue.length) return callback(null, Cache.uniq(result));

        // Loading results.
        var shard = Cache.shard(shardlevel, queue[0]);
        if (!cache[type][shard]) return getter(type, shard, function(err, buffer) {
            if (err) return callback(err);
            try {
                cache.load(buffer, type, shard)
                lazyload();
            } catch(err) {
                callback(err)
            }
        });

        // Queue shard has been loaded into memory.
        while (shard === Cache.shard(shardlevel, queue[0])) {
            var id = queue.shift();
            if (cache[type][shard][id]) result.push.apply(result, cache[type][shard][id]);
        }
        lazyload();
    })();
};

// Load serialized data into memory.
Cache.prototype.load = function(buffer, type, shard) {
    this[type][shard] = buffer ? JSON.parse(buffer) : {};
};

// Serialize cache.
Cache.prototype.pack = function(type, shard) {
    return JSON.stringify(this[type][shard]);
};

// List keys in the cache.
// If only type is specified, lists shards.
// If type and shard are specified, lists keys in shard.
Cache.prototype.list = function(type, shard) {
    return shard === undefined
        ? Object.keys(this[type])
        : Object.keys(this[type][shard]);
};

// Get cache value for a given type/id pair.
Cache.prototype.get = function(type, id) {
    var shard = Cache.shard(this.shardlevel, id);
    return this[type][shard] && this[type][shard][id];
};

// Set cache value for a given type/id pair.
Cache.prototype.set = function(type, id, data) {
    var shard = Cache.shard(this.shardlevel, id);
    this[type][shard] = this[type][shard] || {};
    this[type][shard][id] = data;
};

// Return unique elements of ids.
Cache.uniq = function(ids) {
    var uniq = [];
    var last;
    ids.sort();
    for (var i = 0; i < ids.length; i++) {
        if (ids[i] !== last) {
            last = ids[i];
            uniq.push(ids[i]);
        }
    }
    return uniq;
};

// Return the shard for a given shardlevel + id.
Cache.shard = function(level, id) {
    if (id === undefined) return false;
    if (level === 0) return 0;
    return id % Math.pow(16, level);
};

// Sort a given array of IDs by their shards.
Cache.shardsort = function(level, arr) {
    var mod = Math.pow(16, level);
    arr.sort(function(a,b) {
        var as = a % mod;
        var bs = b % mod;
        return as < bs ? -1 : as > bs ? 1 : a < b ? -1 : a > b ? 1 : 0;
    });
};


