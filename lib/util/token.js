var unidecode = require('unidecode');

module.exports.createReplacer = function(tokens) {
    var replacers = [];

    for (var token in tokens) {
        var entry = {};

        var f = token; // normalize expanded
        entry.from = new RegExp('(\\W|^)' + f + '(\\W|$)', 'gi');
        entry.to = '$1' + tokens[token] + '$2'; // normalize abbrev

        replacers.push(entry);
    }
    return replacers;
};

module.exports.replaceToken = function(tokens, query) {
    var abbr = query;
    for (var i=0; i<tokens.length; i++) {
        var abbr = abbr.replace(tokens[i].from, tokens[i].to);
    }

    return abbr;
}
