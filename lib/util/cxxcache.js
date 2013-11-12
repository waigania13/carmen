var Cache = require('./binding.node').Cache;
// From C++ land
//
// * has(type, shard)
// * load(buffer, type, shard, [callback])
// * loadSync(buffer, type, shard, [callback])
// * search(type, shard, id)
// * put(type, shard, id, data)
// * pack(type, shard, encoding)
// * list(type, [shard])
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
    arr.sort(sortMod);
    function sortMod(a,b) {
        var as = a % mod;
        var bs = b % mod;
        return as < bs ? -1 : as > bs ? 1 : a < b ? -1 : a > b ? 1 : 0;
    }
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

// Store a id->data pair into this cache, computing the appropriate shard
Cache.prototype.set = function(type, id, data) {
    var shard = Cache.shard(this.shardlevel, +id);
    this.put(type, shard, +id, data);
};

// Get the data that belongs to a specific `data` member.
Cache.prototype.get = function(type, id) {
    var shard = Cache.shard(this.shardlevel, +id);
    return this.search(type, shard, +id);
};

// # getall
//
// @param {Function} getter a function that accepts `(type, shard, callback)`
// and given a type and shard, grabs all possible results.
// @param {String} type
// @param {Array} ids an array of ids as numbers
// @param {Function} callback a function invoked with `(error, unique results)`
Cache.prototype.getall = function(getter, type, ids, callback) {
    if (!ids.length) return callback(null, []);

    var shardlevel = this.shardlevel,
        cache = this,
        queues = Cache.shards(shardlevel, ids),
        shards = Object.keys(queues),
        remaining = shards.length,
        result = [];

    for (var i = 0; i < shards.length; i++) {
        var shard = +shards[i];
        loadshard(shard, queues[shard], false);
    }

    function error(err) {
        remaining = -1;
        return callback(err);
    }

    function loadshard(shard, queue, force) {
        // Loading results.
        var has_shard = force || cache.has(type, shard);

        if (!has_shard) {
            return getter(type, shard, cacheloadshard);
        }

        function cacheloadshard(err, buffer) {
            if (err) return error(err);
            else if (!buffer) return loadshard(shard, queue, true);
            else {
                try {
                    // Sync load is used because async call is
                    // experimental/not yet stable
                    cache.loadSync(buffer, type, shard);
                    loadshard(shard, queue, false);
                } catch(e) {
                    error(e);
                }
            }
        }

        // Queue shard has been loaded into memory.
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
