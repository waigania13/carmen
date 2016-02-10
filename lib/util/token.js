var unidecode = require('unidecode-cxx');
var XRegExp = require('xregexp');

// this is all punctuation including unicode punctuation, plus all whitespace
var WORD_BOUNDARY = "[\\s\\u2000-\\u206F\\u2E00-\\u2E7F\\\\'!\"#$%&()*+,\\-.\\/:;<=>?@\\[\\]^_`{|}~]";

module.exports.createReplacer = function(tokens) {
    var replacers = [];

    for (var token in tokens) {
        var from = token; // normalize expanded
        var to = tokens[token];

        for (var u = 0; u < 2; u++) {
            // first add the non-unidecoded version to the token replacer, then,
            // if unidecode changes the string, add it again
            if (u) {
                var unidecoded = unidecode(from);
                if (from === unidecoded) {
                    continue;
                } else {
                    from = unidecoded;
                }
            }

            var entry = {};
            var parsedFrom = new XRegExp(from);
            entry.named = (parsedFrom.xregexp.captureNames !== null);

            // ensure that named groups are all or nothing; otherwise we have order problems
            if (entry.named && parsedFrom.xregexp.captureNames.some(function(captureName) { return captureName === null; }))
                throw new Error('Cannot process \'%s\'; must use either named or numbered capture groups, not both', from);

            if (entry.named) {
                entry.from = new XRegExp('(?<tokenBeginning>' + WORD_BOUNDARY + '|^)' + from + '(?<tokenEnding>' + WORD_BOUNDARY + '|$)', 'gi');
                entry.to = '${tokenBeginning}' + to + '${tokenEnding}';
            }
            else {
                entry.from = new RegExp('(' + WORD_BOUNDARY + '|^)' + from + '(' + WORD_BOUNDARY + '|$)', 'gi');

                // increment replacements indexes in `to`
                var groupReplacements = 0;
                to = to.replace(/\$(\d+)/g, function(str, index) { groupReplacements++; return '$' + (parseInt(index)+1).toString();});
                entry.to = '$1' + to + '$' + (groupReplacements + 2).toString(); // normalize abbrev
            }

            replacers.push(entry);
        }
    }
    return replacers;
};

module.exports.replaceToken = function(tokens, query) {
    var abbr = query;
    for (var i=0; i<tokens.length; i++) {
        if (tokens[i].named)
            abbr = XRegExp.replace(abbr, tokens[i].from, tokens[i].to);
        else
            abbr = abbr.replace(tokens[i].from, tokens[i].to);
    }

    return abbr;
}
