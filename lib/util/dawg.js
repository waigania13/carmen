'use strict';
const _dawgCache = require('dawg-cache');
const NormalizationCache = require('@mapbox/carmen-cache').NormalizationCache;
const DEBUG = process.env.DEBUG;

const Map = require('es6-native-map');
const Set = require('es6-native-set');

const WriteCache = function() {
    this.data = new Map();

    this.normalizationMap = new Map();
    this.normalizationTargets = new Set();
};

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

WriteCache.prototype.setNormalization = function(nonstandard, standard) {
    this.setText(nonstandard, false);
    this.setText(standard, true);

    if (!this.normalizationMap.has(nonstandard)) this.normalizationMap.set(nonstandard, new Set());
    this.normalizationMap.get(nonstandard).add(standard);
    this.normalizationTargets.add(standard);
};

WriteCache.prototype.dump = function() {
    const dawg = new _dawgCache.Dawg();
    const prefixes = Array.from(this.data.keys()).sort();
    for (let i = 0; i < prefixes.length; i++) {
        const phrases = [];
        for (const k of this.data.get(prefixes[i]).keys()) {
            phrases.push(new Buffer(k));
        }
        phrases.sort(Buffer.compare);
        for (let j = 0; j < phrases.length; j++) {
            dawg.insert(phrases[j].toString());
        }
    }
    dawg.finish();

    return dawg.toCompactDawgBuffer();
};

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
        for (let j = 0; j < phrases.length; j++) {
            const phraseString = phrases[j].toString();
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

const ReadCache = _dawgCache.CompactDawg;

ReadCache.prototype.hasPhrase = function(text, ender) {
    return ender ? this.lookupPrefix(text) : this.lookup(text);
};

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

ReadCache.prototype.loadNormalizationCache = function(normalizationCachePath) {
    this.normalizationCache = new NormalizationCache(normalizationCachePath, true);
};

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
