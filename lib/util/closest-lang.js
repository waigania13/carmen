var mun = require("model-un");

/* from http://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex */
var escapeRegExp = function(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

var getCharset = function(mLang) {
    // check if there's a script subtag
    var scripts = mLang.filter(function(item) { return item.type == "script"; });
    if (scripts.length) return scripts[0].subtag;

    // check if there's a language subtag with a suppress-script property
    for (var i = 0; i < mLang.length; i++) {
        if (mLang[i].type == "langage" && mLang[i]["suppress-script"]) {
            return mLang[i]["suppress-script"];
        }
    }
}

var getLanguage = function(mLang) {
    var languages = mLang.filter(function(item) { return item.type == "language" || item.type == "macrolanguage"; });
    if (languages.length) return languages[0].subtag;
}

var bestMatch = function(mCandidates) {
    var codes = mCandidates.map(function(item) { return item.code; });

    // sort first by length, then alphabetically
    codes = codes.sort(function(a, b) {
        if (a.length != b.length) return a.length - b.length;

        if (a > b) return 1;
        if (a < b) return -1;
        return 0;
    })
    return codes[0];
}

var munGetLanguage = function(lang) {
    var munLang = mun.getLanguage(lang);
    return {"code": lang, "subtags": Array.isArray(munLang) ? munLang : [munLang]};
}

var closestLang = function(target, candidates, prefix) {
    prefix = prefix || "";

    if (candidates[prefix + target]) return candidates[prefix + target];

    if (prefix) {
        var rPrefix = new RegExp("^" + escapeRegExp(prefix));
        rCandidates = Object.keys(candidates)
          .filter(function(item) { rPrefix.exec(item); })
          .map(function(item) { return item.replace(rPrefix, ""); });
    } else {
        rCandidates = Object.keys(candidates);
    }

    mTarget = munGetLanguage(target);
    mCandidates = rCandidates.map(function(item) { return munGetLanguage(item); });
    console.log(mTarget, mCandidates);

    var targetLanguage = getLanguage(mTarget.subtags);
    if (!targetLanguage) return;

    var languageMatches = mCandidates.filter(function(item) { return getLanguage(item.subtags) == targetLanguage; });
    if (languageMatches.length) {
        // check if there's one that's also a charset match
        var targetCharset = getCharset(mTarget.subtags);
        var charsetMatches = languageMatches.filter(function(item) { return getCharset(item.subtags) == targetCharset; });

        if (charsetMatches.length) return candidates[prefix + bestMatch(charsetMatches)];
        return candidates[prefix + bestMatch(languageMatches)];
    }
}

module.exports = closestLang;