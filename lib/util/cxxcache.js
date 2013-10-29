var Cache = require('./binding.node').Cache;
exports = module.exports = Cache;

// Return the shard for a given shardlevel + id.
Cache.shard = function(level, id) {
    if (id === undefined) return false;
    if (level === 0) return 0;
    return id % Math.pow(16, level);
};

// Group a queue of IDs by their respective shards.
Cache.shards = function(shardlevel, queue) {
    var mod = Math.pow(16, shardlevel);
    var shards = {};
    for (var i = 0; i < queue.length; i++) {
        var shard = queue[i] % mod;
        shards[shard] = shards[shard] || [];
        shards[shard].push(queue[i]);
    }
    return shards;
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
    if (!ids.length) return callback(null, []);

    var shardlevel = this.shardlevel;
    var cache = this;
    var queues = Cache.shards(shardlevel, ids);
    var shards = Object.keys(queues);
    var remaining = shards.length;
    var result = [];

    for (var i = 0; i < shards.length; i++) {
        var shard = +shards[i];
        loadshard(shard, queues[shard]);
    }

    function error(err) {
        remaining = -1;
        return callback(err);
    }

    function loadshard(shard, queue, force) {
        // Loading results.
        var has_shard = force || cache.has(type, shard);
        if (!has_shard) return getter(type, shard, function(err, buffer) {
            if (err) return error(err);
            if (!buffer) return loadshard(shard, queue, true);
            try {
                cache.load(buffer, type, shard);
                loadshard(shard, queue);
            } catch(err) {
                error(err);
            }
        });

        // Queue shard has been loaded into memory.
        // TODO - get buffer once, then search for id
        for (var a = 0; a < queue.length; a++) {
            var id = queue[a];
            // if (+id > Math.pow(2,32)) console.warn('ID %s', id);
            var match = cache.search(type,+shard,+id);
            if (match) for (var i = 0; i < match.length; i++) result.push(match[i]);
        }

        // All loads are complete.
        if (!--remaining) {
            var uniq = type === 'grid' ? result : Cache.uniq(result);
            return callback(null, uniq);
        }
    }
};
