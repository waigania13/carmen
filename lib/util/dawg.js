var _dawgCache = require("dawg-cache");
var NormalizationCache = require("@mapbox/carmen-cache").NormalizationCache;
var DEBUG = process.env.DEBUG;

var WriteCache = function() {
    this.data = new Map();

    this.normalizationMap = new Map();
    this.normalizationTargets = new Set();
}

WriteCache.prototype.setText = function(text) {
    if (text == "") {
        throw new Error("The DAWG cache can't store the empty string");
    } else {
        var first = new Buffer(text).slice(0,3).toString('hex');
        if (!this.data.has(first)) this.data.set(first, new Set());
        this.data.get(first).add(text);
    }
}

WriteCache.prototype.setNormalization = function(nonstandard, standard) {
    this.setText(nonstandard);
    this.setText(standard);

    this.normalizationMap.set(nonstandard, standard);
    this.normalizationTargets.add(standard);
}

WriteCache.prototype.dump = function() {
    var dawg = new _dawgCache.Dawg();
    var prefixes = Array.from(this.data.keys()).sort();
    for (var i = 0; i < prefixes.length; i++) {
        var phrases = [];
        this.data.get(prefixes[i]).forEach(function(item) { phrases.push(new Buffer(item)); });
        phrases.sort(Buffer.compare);
        for (var j = 0; j < phrases.length; j++) {
            dawg.insert(phrases[j].toString());
        }
    }
    dawg.finish();

    return dawg.toCompactDawgBuffer();
}

WriteCache.prototype.dumpWithNormalizations = function(normalizationCachePath) {
    var dawg = new _dawgCache.Dawg();
    var prefixes = Array.from(this.data.keys()).sort();

    let idx = 0;
    let normalizationIndexes = new Map();

    for (var i = 0; i < prefixes.length; i++) {
        var phrases = [];
        this.data.get(prefixes[i]).forEach(function(item) { phrases.push(new Buffer(item)); });
        phrases.sort(Buffer.compare);
        for (var j = 0; j < phrases.length; j++) {
            let phraseString = phrases[j].toString();
            dawg.insert(phraseString);

            if (this.normalizationMap.has(phraseString) || this.normalizationTargets.has(phraseString)) {
                normalizationIndexes.set(phraseString, idx);
            }

            idx++;
        }
    }
    dawg.finish();

    let out = dawg.toCompactDawgBuffer(true);

    let normCache = new NormalizationCache(normalizationCachePath, false);
    let normData = [];
    for (let item of this.normalizationMap) {
        normData.push([normalizationIndexes.get(item[0]), normalizationIndexes.get(item[1])]);
    }
    normCache.writeBatch(normData);

    return out;
}

var ReadCache = _dawgCache.CompactDawg;

ReadCache.prototype.hasPhrase = function(text, ender) {
    return ender ? this.lookupPrefix(text) : this.lookup(text);
}

ReadCache.prototype.hasPhraseOrNormalizations = function(text, ender) {
    var match = ender ? this.lookupPrefixCounts(text) : this.lookupCounts(text);
    let norms = [];
    if (match.found) {
        if (this.normalizationCache) {
            if (ender) {
                norms = this.normalizationCache.getPrefixRange(match.index, match.suffixCount);
            } else {
                let norm = this.normalizationCache.get(match.index);
                if (typeof norm !== 'undefined') norms.push(norm);
            }
            let _this = this;
            match.normalizations = norms.map(function(idx) { return _this.lookupCounts(idx).text; });
        }
        return match;
    } else {
        return false;
    }
}

ReadCache.prototype.loadNormalizationCache = function(normalizationCachePath) {
    this.normalizationCache = new NormalizationCache(normalizationCachePath, true);
}

var DawgCache = function(buf, normalizationPath) {
    if (buf && buf.length) {
        let out = new ReadCache(buf);
        if (normalizationPath) out.loadNormalizationCache(normalizationPath);
        return out;
    } else {
        return new WriteCache();
    }
}

ReadCache.prototype.properties = WriteCache.prototype.properties = {
    needsText: true,
    needsDegens: false,
    type: "dawg"
}

// build a ReadCache at the last minute if hasPhrase is ever called on WriteCache; define after ReadCache to appease the linter
WriteCache.prototype.hasPhrase = function(text, ender) {
    if (DEBUG) console.warn("calling hasPhrase on a DAWG WriteCache is very inefficient")
    return (new ReadCache(this.dump())).hasPhrase(text, ender);
}

WriteCache.prototype.hasPhraseOrNormalizations = function(text, ender) {
    if (DEBUG) console.warn("calling hasPhraseOrNormalizations on a DAWG WriteCache is very inefficient")

    let file = "/tmp/temp." + Math.random().toString(36).substr(2, 5);
    let dump = this.dumpWithNormalizations(file);
    let rc = new ReadCache(dump);
    rc.loadNormalizationCache(file);

    return (rc.hasPhraseOrNormalizations(text, ender));
}

WriteCache.prototype.iterator = function(string) {
    if (DEBUG) console.warn("calling iterator on a DAWG WriteCache is very inefficient")
    return (new ReadCache(this.dump())).iterator(string);
}

WriteCache.prototype[Symbol.iterator] = WriteCache.prototype.iterator;

WriteCache.prototype.getPhrasesFromDegen = function(phraseObj) {
    return (new ReadCache(this.dump())).getPhrasesFromDegen(phraseObj);
}

module.exports = DawgCache;
