var mun = require("model-un");

/* model-un data proprocessing */
var munLanguages = require("model-un/data/languages");
var munLanguageRef = require("model-un/data/languageref")
var languageOnlyRef = {};
var nonLanguageRef = {};
Object.keys(munLanguageRef).forEach(function(k) {
    if (munLanguages[munLanguageRef[k]].type == "language") {
        languageOnlyRef[k] = munLanguageRef[k];
    } else {
        nonLanguageRef[k] = munLanguageRef[k];
    }
});
[languageOnlyRef, nonLanguageRef].forEach(function(ref) {
    Object.keys(ref).forEach(function(k) {
        if (k.search(/[A-Z]/) != -1) {
            var lk = k.toLowerCase();
            if (typeof ref[lk] === "undefined") {
                ref[lk] = ref[k];
            }
        }
    });
});

/* this is an alternate implementation of model-un.getLanguage that differs as follows:
    * the first token is always assumed to be a language
    * subsequent tokens are assumed to be non-languages
    * in both cases, matching is quasi-case-insensitive: where an exact case match is not
      found, an all-lowercase match is attempted
*/

var getLanguage = function(str) {
    var match;
    match = languageOnlyRef[str];
    if (match) return munLanguages[match];

    str = str.replace(/_/g, '-').split('-');
    if (str.length > 1) {
        match = [];
        str.forEach(function(d, i) {
            var obj = munLanguages[i == 0 ? languageOnlyRef[d] : nonLanguageRef[d]];
            if (!obj && d.search(/[A-Z]/) != -1) {
                var ld = d.toLowerCase();
                obj = munLanguages[i == 0 ? languageOnlyRef[ld] : nonLanguageRef[ld]];
            }
            if (obj) match.push(obj);
        });
        return match;
    }
    return false;
}

/* alternative implementation of model-un.hasLanguage that's more permissive:
   if getLanguage returns a language, return true */

var hasLanguage = function(str) {
    var language = getLanguage(str);
    return (language && language[0].type == "language");
}

/* from http://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex */
var escapeRegExp = function(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

var getScript = function(mLang) {
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

var getLanguageComponent = function(mLang) {
    var languages = mLang.filter(function(item) { return item.type == "language" });
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

var getLanguageArray = function(lang) {
    var munLang = getLanguage(lang);
    return {"code": lang, "subtags": Array.isArray(munLang) ? munLang : [munLang]};
}

var closestLang = function(target, candidates, prefix) {
    prefix = prefix || "";

    if (candidates[prefix + target]) return candidates[prefix + target];

    if (prefix) {
        var rPrefix = new RegExp("^" + escapeRegExp(prefix));
        rCandidates = Object.keys(candidates)
          .filter(function(item) { return rPrefix.exec(item); })
          .map(function(item) { return item.replace(rPrefix, ""); });
    } else {
        rCandidates = Object.keys(candidates);
    }

    mTarget = getLanguageArray(target);
    mCandidates = rCandidates.map(function(item) { return getLanguageArray(item); });

    var targetLanguage = getLanguageComponent(mTarget.subtags);
    if (!targetLanguage) return;

    var languageMatches = mCandidates.filter(function(item) { return getLanguageComponent(item.subtags) == targetLanguage; });
    if (languageMatches.length) {
        // check if there's one that's also a script match
        var targetScript = getScript(mTarget.subtags);
        var scriptMatches = languageMatches.filter(function(item) { return getScript(item.subtags) == targetScript; });

        if (scriptMatches.length) return candidates[prefix + bestMatch(scriptMatches)];
        return candidates[prefix + bestMatch(languageMatches)];
    }
}

module.exports = closestLang;
module.exports.getLanguage = getLanguage;
module.exports.hasLanguage = hasLanguage;