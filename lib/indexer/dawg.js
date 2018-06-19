'use strict';
const _dawgCache = require('dawg-cache');
const NormalizationCache = require('@mapbox/carmen-cache').NormalizationCache;
const DEBUG = process.env.DEBUG;

const Map = require('es6-native-map');
const Set = require('es6-native-set');

/**
 * Interface to a dawg cache that allows writing
 *
 */
const WriteCache = function() {
    this.data = new Map();

    this.normalizationMap = new Map();
    this.normalizationTargets = new Set();
};

/**
 * Add a new phrase to the cache
 *
 * @param {string} text - new phrase to be added
 * @param {boolean} mapsToSelf - should this entry map to itself in the cache. this is `false` in the case of a non-normalized phrase if there is a normalized version to be added. See {@link setNormalization} for context.
 */
WriteCache.prototype.setText = function(text, mapsToSelf) {
    if (typeof mapsToSelf === 'undefined') mapsToSelf = true;
    if (text === '') {
        throw new Error("The DAWG cache can't store the empty string");
    } else {
        const first = new Buffer(text).slice(0,3).toString('hex');
        let subMap = this.data.get(first);
        if (!subMap) {
            subMap = new Map();
            this.data.set(first, subMap);
        }
        subMap.set(text, subMap.get(text) || mapsToSelf);
    }
};

/**
 * Add a nonstandard variant of a phrase and its standard (normalized) version.
 *
 * @param {string} nonstandard - a nonstandard (non-normalized) phrase
 * @param {string} standard - a standard (normalized) version of `nonstandard`
 */
WriteCache.prototype.setNormalization = function(nonstandard, standard) {
    this.setText(nonstandard, false);
    this.setText(standard, true);

    if (!this.normalizationMap.has(nonstandard)) this.normalizationMap.set(nonstandard, new Set());
    this.normalizationMap.get(nonstandard).add(standard);
    this.normalizationTargets.add(standard);
};

/**
 * Dump the cache to a buffer
 *
 * @returns {Buffer} a `CompactDawgBuffer`, suitable for initializing a {@link ReadCache}
 */
WriteCache.prototype.dump = function() {
    //new fuzzyphrasesetbuilder()
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

            // TODO: insert the phrases into fuzzyset here:
            dawg.insert(phraseString);
        }
    }
    // TODO: https://github.com/mapbox/node-fuzzy-phrase/blob/master/test/all.js#L25
    dawg.finish();

    return dawg.toCompactDawgBuffer();
};

/**
 * Dump the cache to a buffer, and dump the normalization data to a path on disk
 *
 * @param {string} normalizationCachePath - path where normaliztion data will be written
 * @returns {Buffer} a `CompactDawgBuffer`, suitable for initializing a {@link ReadCache}
 */
WriteCache.prototype.dumpWithNormalizations = function(normalizationCachePath) {
    const dawg = new _dawgCache.Dawg();
    const prefixes = Array.from(this.data.keys()).sort();

    let idx = 0;
    const normalizationIndexes = new Map();
    const mapsToSelf = new Set();

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

            if (this.normalizationMap.has(phraseString) || this.normalizationTargets.has(phraseString)) {
                normalizationIndexes.set(phraseString, idx);
                if (this.data.get(prefixes[i]).get(phraseString)) mapsToSelf.add(phraseString);
            }

            idx++;
        }
    }
    dawg.finish();

    const out = dawg.toCompactDawgBuffer(true);

    const normCache = new NormalizationCache(normalizationCachePath, false);
    const normData = [];
    for (const entry of this.normalizationMap) {
        const key = entry[0];
        let values = entry[1];
        // if this key maps to both itself and other values, add itself to the set
        if (mapsToSelf.has(key)) {
            values = new Set([...values, key]);
        }

        normData.push([
            normalizationIndexes.get(key),
            Array.from(values).map((v) => { return normalizationIndexes.get(v); }).sort(),
        ]);
    }
    normCache.writeBatch(normData);

    return out;
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
 * Check to see if `text` is in the cache. If it is, return a match object that includes the normalized form(s) of the query. Normalized forms are found using a {@link https://github.com/mapbox/carmen-cache/blob/master/API.md#normalizationcache carmen-cache NormalizationCache}.
 *
 * Used by {@link phrasematch}.
 *
 * @param {string} text - A query string
 * @param {boolean} ender - if true, perform a prefix lookup
 * @returns {DawgMatch} a detailed match object
 */
ReadCache.prototype.hasPhraseOrNormalizations = function(text, ender) {
    const match = ender ? this.lookupPrefixCounts(text) : this.lookupCounts(text);
    let norms = [];
    if (match.found) {
        if (this.normalizationCache) {
            if (ender) {
                norms = norms.concat(this.normalizationCache.getPrefixRange(match.index, match.suffixCount));
            } else {
                const norm = this.normalizationCache.get(match.index);
                if (typeof norm !== 'undefined') norms = norms.concat(norm);
            }
            const _this = this;
            match.normalizations = norms.map((idx) => { return _this.lookupCounts(idx).text; });
        }
        return match;
    } else {
        return false;
    }
};

/**
 * Load a normalization cache
 *
 * @param {string} normalizationCachePath - path to normalization cache
 */
ReadCache.prototype.loadNormalizationCache = function(normalizationCachePath) {
    this.normalizationCache = new NormalizationCache(normalizationCachePath, true);
};

/**
 * A cache for performing fast text matching
 *
 * @param {Buffer} buf - buffer containing an already-compiled dawg-cache
 * @param {string} normalizationPath - path to normalization data
 * @returns {(ReadCache|WriteCache)} if `buf` is truthy and has nonzero length, a {@link ReadCache} is returned. otherwise, it is assumed that a new cache is going to be created, and a {@link WriteCache} is returned.
 */
const DawgCache = function(buf, normalizationPath) {
    if (buf && buf.length) {
        const out = new ReadCache(buf);
        if (normalizationPath) out.loadNormalizationCache(normalizationPath);
        return out;
    } else {
        return new WriteCache();
    }
};

ReadCache.prototype.properties = WriteCache.prototype.properties = {
    needsText: true,
    needsDegens: false,
    type: 'dawg'
};

// build a ReadCache at the last minute if hasPhrase is ever called on WriteCache; define after ReadCache to appease the linter
WriteCache.prototype.hasPhrase = function(text, ender) {
    if (DEBUG) console.warn('calling hasPhrase on a DAWG WriteCache is very inefficient');
    return (new ReadCache(this.dump())).hasPhrase(text, ender);
};

WriteCache.prototype.hasPhraseOrNormalizations = function(text, ender) {
    if (DEBUG) console.warn('calling hasPhraseOrNormalizations on a DAWG WriteCache is very inefficient');

    const file = '/tmp/temp.' + Math.random().toString(36).substr(2, 5);
    const dump = this.dumpWithNormalizations(file);
    const rc = new ReadCache(dump);
    rc.loadNormalizationCache(file);

    return (rc.hasPhraseOrNormalizations(text, ender));
};

WriteCache.prototype.iterator = function(string) {
    if (DEBUG) console.warn('calling iterator on a DAWG WriteCache is very inefficient');
    return (new ReadCache(this.dump())).iterator(string);
};

WriteCache.prototype[Symbol.iterator] = WriteCache.prototype.iterator;

WriteCache.prototype.getPhrasesFromDegen = function(phraseObj) {
    return (new ReadCache(this.dump())).getPhrasesFromDegen(phraseObj);
};

module.exports = DawgCache;
