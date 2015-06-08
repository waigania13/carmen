var unidecode = require('unidecode');
var XRegExp = require('xregexp').XRegExp;

module.exports.createReplacer = function(tokens) {
    var replacers = [];

    for (var token in tokens) {
        if (tokens[token].match(/\$\d+/)) throw new Error('Numbered capture groups not permitted in token. Use named groups instead, e.g. (?<groupname>\\d)');
        var entry = {};

        var f = unidecode(token); // normalize expanded
        entry.from = new XRegExp("(?<tokenBoundaryStart>\\W|^)"+f+"(?<tokenBoundaryEnd>\\W|$)", "gi"); // create regex obj for expanded
        entry.to = unidecode("${tokenBoundaryStart}"+tokens[token]+"${tokenBoundaryEnd}"); // normalize abbrev

        replacers.push(entry);
    }
    return replacers;
};

module.exports.replaceToken = function(tokens, query) {
    var query = unidecode(query);

    var abbr = query;
    for (var i=0; i<tokens.length; i++) {
        var abbr = XRegExp.replace(abbr, tokens[i].from, tokens[i].to);
    }

    return abbr;
}
