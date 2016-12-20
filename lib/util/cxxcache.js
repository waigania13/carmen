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
// index type by looking in both the memory cache
// and the lazy cache.
// - has(type)
//
// Load data into memory synchronously (recommend)
// This connects a rocksdb directory to carmen-cache
// to use as the lazy cache for a given type
// - loadSync(filename, type)
//
// Gets data for a given type, and id
// Copied to the JS land function 'get'
// - _get(type, id)
//
// Adds a JS array to the cache for given type
// and id. This adds data directly to the fully materialized
// cache and leaves the lazy protobuf cache untouched
// which is in contrast to the load method.
// Copied to the JS land function 'set'
// - _set(type, id, data)
//
// Writes a rocksdb database to the given filename
// containing the lazy representation of all data for a given
// type.
// - pack(filename, type)
//
// Returns the ids for all arrays for the matching type.
// Looks in both the memory cache and the lazy cache for
// matches.
// - list(type)
//
// Removes cached data for given type from
// both the memory and lazy caches.
// - unload(type)

exports = module.exports = Cache;

// Store a id->data pair into this cache
Cache.prototype.set = Cache.prototype._set;

// Get the data that belongs to a specific `data` member.
Cache.prototype.get = Cache.prototype._get;

// # getall
//
// @param {String} type
// @param {Array} ids an array of ids as numbers
// @param {Function} callback a function invoked with `(error, unique results)`
Cache.prototype.getall = function(type, ids, callback) {
    var cache = this;
    var result = [];

    for (var i = 0; i < ids.length; i++) {
        var match = cache._get(type, ids[i]);
        if (match) {
            var j = match.length;
            while (j--) result.push(match[i]);
        }
    }

    result = type === 'grid' ? result : uniq(result);
    callback(null, result);
};