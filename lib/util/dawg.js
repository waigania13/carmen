var _dawgCache = require("dawg-cache");
var DEBUG = process.env.DEBUG;

var WriteCache = function() {
    this.data = new Map();
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

var ReadCache = _dawgCache.CompactDawg;

ReadCache.prototype.hasPhrase = function(text, ender) {
    return ender ? this.lookupPrefix(text) : this.lookup(text);
}

var DawgCache = function(buf) {
    if (buf && buf.length) {
        return new ReadCache(buf);
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

WriteCache.prototype.iterator = function(string) {
    if (DEBUG) console.warn("calling iterator on a DAWG WriteCache is very inefficient")
    return (new ReadCache(this.dump())).iterator(string);
}

WriteCache.prototype[Symbol.iterator] = WriteCache.prototype.iterator;

WriteCache.prototype.getPhrasesFromDegen = function(phraseObj) {
    return (new ReadCache(this.dump())).getPhrasesFromDegen(phraseObj);
}

module.exports = DawgCache;
