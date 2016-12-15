var cc = require('carmen-cache');
var Cache = cc.Cache;
var uniq = require('./uniq');

// This file wraps the Cache object coming from C++
//
// This object internally uses two caches: one to
// store fully materialized data (called 'memory' cache)
// and another that stores a raw protobuf representation
// of the data (called 'lazy' cache) which needs extra
// work to decode before being usable.
//
// This object offers to JS these functions:
//
// Returns whether the Cache has data loaded for a given
// index type and shard by looking in both the memory cache
// and the lazy cache.
// - has(type, shard)
//
// Load data into memory synchronously (recommend)
// This adds data to the lazy cache only because this
// is faster than fully materializing the data into the
// memory cache and also takes up less memory.
// - loadSync(buffer, type, shard)
//
// Loads data into memory asynchronously
// NOT recommended to use at this time / experimental
// Note: if no callback is passed this dispatches to loadSync
// - load(buffer, type, shard, callback)
//
// Gets data for a given type, shard, and id
// Wrapped by the JS land function 'get'
// - _get(type, shard, id)
//
// Adds a JS array to the cache for given type, shard,
// and id. This adds data directly to the fully materialized
// cache and leaves the lazy protobuf cache untouched
// which is in contrast to the load method.
// Wrapped by the JS land function 'set'
// - _set(type, shard, id, data)
//
// Returns a buffer containing the protobuf
// representation for a given type and shard that
// is already loaded into the cache. This searches
// both the memory cache and the lazy cache for a match
// and throws if none is found.
// - pack(type, shard)
//
// If one arg (type) is passed then list returns the
// available shards ids for a given type. If two args are
// passed (both type and shard) then list returns the
// ids for all arrays for the matching shard. This method
// looks in both the memory cache and the lazy cache for
// matches.
// - list(type, [shard])
//
// Removes cached data for given type and shard from
// both the memory and lazy caches.
// - unload(type, shard)

exports = module.exports = Cache;

// Store a id->data pair into this cache, computing the appropriate shard
Cache.prototype.set = Cache.prototype._set;

// Get the data that belongs to a specific `data` member.
Cache.prototype.get = Cache.prototype._get;

// # getall
//
// @param {Function} getter a function that accepts `(type, shard, callback)`
// and given a type and shard, grabs all possible results.
// @param {String} type
// @param {Array} ids an array of ids as numbers
// @param {Function} callback a function invoked with `(error, unique results)`
Cache.prototype.getall = function(getter, type, ids, callback) {
    var cache = this;
    var result = [];

    for (var i = 0; i < ids.length; i++) {
        var match = cache._get(type,+shard,id);
        if (match) {
            var i = match.length;
            while (i--) result.push(match[i]);
        }
    }

    result = type === 'grid' ? result : uniq(result);
    callback(null, result);
};