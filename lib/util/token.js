var unidecode = require('unidecode');

module.exports.createReplacer = function(tokens) {
    var replacers = [];

    for (var token in tokens) {
        var entry = {};

        var f = unidecode(token); // normalize expanded
        entry.from = new RegExp(f, 'gi');
        entry.to = unidecode(tokens[token]); // normalize abbrev

        replacers.push(entry);
    }
    return replacers;
};

module.exports.replaceToken = function(tokens, query) {
    var query = unidecode(query);

    var abbr = query;
    for (var i=0; i<tokens.length; i++) {
        var abbr = abbr.replace(tokens[i].from, tokens[i].to);
    }

    return abbr;
}
