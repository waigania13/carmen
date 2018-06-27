'use strict';
const _dawgCache = require('dawg-cache');
const DEBUG = process.env.DEBUG;

const Map = require('es6-native-map');

/**
 * Interface to a dawg cache that allows writing
 *
 */
const WriteCache = function() {
    this.data = new Map();
};

/**
 * Add a new phrase to the cache
 *
 * @param {string} text - new phrase to be added
 */
WriteCache.prototype.setText = function(text) {
    if (text === '') {
        throw new Error("The DAWG cache can't store the empty string");
    } else {
        const first = new Buffer(text).slice(0,3).toString('hex');
        let subMap = this.data.get(first);
        if (!subMap) {
            subMap = new Map();
            this.data.set(first, subMap);
        }
        subMap.set(text, subMap.get(text));
    }
};

/**
 * Dump the cache to a buffer
 *
 * @returns {Buffer} a `CompactDawgBuffer`, suitable for initializing a {@link ReadCache}
 */
WriteCache.prototype.dump = function() {
    const dawg = new _dawgCache.Dawg();
    const prefixes = Array.from(this.data.keys()).sort();
    for (let i = 0; i < prefixes.length; i++) {
        const phrases = [];
        for (const k of this.data.get(prefixes[i]).keys()) {
            phrases.push(new Buffer(k));
        }
        phrases.sort(Buffer.compare);

        let lastInserted = null;
        for (let j = 0; j < phrases.length; j++) {
            const phraseString = phrases[j].toString();

            if (phraseString === lastInserted) continue;
            lastInserted = phraseString;

            dawg.insert(phraseString);
        }
    }
    dawg.finish();

    return dawg.toCompactDawgBuffer();
};

/**
 * A detailed match result including counts and normalized versions of the query
 *
 * @typedef DawgMatch
 * @property {boolean} found - true iff the query was found in the cache
 * @property {number} skipped - number of nodes skipped
 * @property {number} suffixCount - the number of phrases that begin with the matched text
 * @property {string} text - matched string
 * @property {(Array<string>|undefined)} normalizations - if a `NormalizationCache` was available, an array of the normalized versions of the query string, else `undefined`.
 */

/**
 * A dawg-cache CompactDawg
 *
 */
const ReadCache = _dawgCache.CompactDawg;

/**
 * Check to see if `text` is in the cache.
 *
 * Used by {@link phrasematch}.
 *
 * @param {string} text - a query string
 * @param {boolean} ender - if true, perform a prefix lookup
 * @returns {boolean} true iff the phrase is found in the cache
 */
ReadCache.prototype.hasPhrase = function(text, ender) {
    return ender ? this.lookupPrefix(text) : this.lookup(text);
};

/**
 * A cache for performing fast text matching
 *
 * @param {Buffer} buf - buffer containing an already-compiled dawg-cache
 * @returns {(ReadCache|WriteCache)} if `buf` is truthy and has nonzero length, a {@link ReadCache} is returned. otherwise, it is assumed that a new cache is going to be created, and a {@link WriteCache} is returned.
 */
const DawgCache = function(buf) {
    // TODO: move <20-06-18, boblannon> //
    // this is null when making a new index
    if (buf && buf.length) {
        const out = new ReadCache(buf);
        return out;
    } else {
        return new WriteCache();
    }
};

// build a ReadCache at the last minute if hasPhrase is ever called on WriteCache; define after ReadCache to appease the linter
WriteCache.prototype.hasPhrase = function(text, ender) {
    if (DEBUG) console.warn('calling hasPhrase on a DAWG WriteCache is very inefficient');
    return (new ReadCache(this.dump())).hasPhrase(text, ender);
};

module.exports = DawgCache;
