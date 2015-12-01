var unidecode = require('unidecode-cxx');

module.exports.createReplacer = function(tokens) {
    var replacers = [];

    for (var token in tokens) {
        var from = token; // normalize expanded
        var to = tokens[token];

        for (var u = 0; u < 2; u++) {
            if (u) {
                var unidecoded = unidecode(from);
                if (from === unidecoded) {
                    continue;
                } else {
                    from = unidecoded;
                }
            }

            var entry = {};
            entry.from = new RegExp('(\\W|^)' + from + '(\\W|$)', 'gi');

            // increment replacements indexes in `from` for each
            // numbered replacement group. Ignores non-numbered replacement
            // groups
            var fromReplacements = 0;
            var fromGroups = from.match(/\((\?\:)?/g);
            if (fromGroups && fromGroups.length) for (var i = 0; i < fromGroups.length; i++) {
                if (fromGroups[i] === '(') fromReplacements++;
            }

            // increment replacements indexes in `to`
            var groupReplacements = 0;
            to = to.replace(/\$(\d+)/g, function(str, index) { groupReplacements++; return '$' + (parseInt(index)+1).toString();});
            entry.to = '$1' + to + '$' + (fromReplacements + 2).toString(); // normalize abbrev

            replacers.push(entry);
        }
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
