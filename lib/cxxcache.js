var Cache = require('./binding.node').Cache;
exports = module.exports = Cache;

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

Cache.prototype.set = function(type,id,data) {
    var shard = Cache.shard(this.shardlevel,+id);
    this._set(type,shard,+id,data);
}

Cache.prototype.get = function(type,id) {
    var shard = Cache.shard(this.shardlevel,+id);
    return this.search(type,shard,+id);
}

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
        var has_shard = cache.has(type,shard);
        if (!has_shard) return getter(type, shard, function(err, buffer) {
            if (err) return callback(err);
            try {
                if (!buffer) {
                    return callback(null);
                    //return callback(new Error("your 'getter' passed an empty buffer to getall"));
                }
                if ((typeof(buffer) == 'string' && buffer[0] == '{') || 
                    (typeof(buffer) == 'object' && buffer[0] == 123)) {
                    cache.loadJSON(JSON.parse(buffer), type, shard);
                } else {
                    cache.load(buffer, type, shard, this.encoding);
                }
                lazyload();
            } catch(err) {
                callback(err)
            }
        });

        // Queue shard has been loaded into memory.
        // TODO - get buffer once, then search for id
        while (shard === Cache.shard(shardlevel, queue[0])) {
            var id = queue.shift();
            var match = cache.search(type,+shard,+id);
            if (match) result.push.apply(result, match);
        }
        lazyload();
    })();
};
