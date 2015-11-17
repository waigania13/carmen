var _dawgCache = require("dawg-cache");

var WriteCache = function() {
    this.data = {};
}

WriteCache.prototype.setText = function(text) {
    if (text == "") {
        this.data[""] = [""];
    } else {
        var first = text.substr(0,1);
        this.data[first] = this.data[first] || {};
        this.data[first][text] = 1;
    }
}

WriteCache.prototype.dump = function() {
    var dawg = new _dawgCache.Dawg();
    var prefixes = Object.keys(this.data).sort();
    for (var i = 0; i < prefixes.length; i++) {
        var phrases = Object.keys(this.data[prefixes[i]]);
        phrases.sort();
        console.log(phrases);
        for (var j = 0; j < phrases.length; j++) {
            dawg.insert(phrases[j]);
        }
    }
    dawg.finish();

    return dawg.toCompactDawgBuffer();
}

var ReadCache = function(buf) {
    _dawgCache.CompactDawg.call(this, buf);
}

ReadCache.prototype = Object.create(_dawgCache.CompactDawg.prototype);

ReadCache.prototype.hasPhrase = function(phraseObj) {
    return phraseObj.degen ? this.lookupPrefix(phraseObj.text) : this.lookup(phraseObj.text);
}

var DawgCache = function(buf) {
    if (buf) {
        return new ReadCache(buf);
    } else {
        return new WriteCache();
    }
}

DawgCache.prototype.properties = {
    needsText: true,
    needsDegens: false
}

module.exports = DawgCache;