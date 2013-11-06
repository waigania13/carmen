var fnv1a = require('./fnv'),
    unidecode = require('unidecode');

// Generate degenerates from a given token.
module.exports.degens = function(token) {
    var length = token.length;
    var degens = {};
    var tokenid = fnv1a(token, 30);
    degens[tokenid] = tokenid;
    for (var i = 1; !i || (i < length && length - i > 2); i++) {
        var degen = fnv1a(token.substr(0, length - i), 30);
        degens[degen] = tokenid + Math.min(i,3);
    }
    return degens;
};

// Converts text into an array of search term hash IDs.
module.exports.terms = function(text) {
    var tokens = tokenize(text);
    for (var i = 0; i < tokens.length; i++) tokens[i] = fnv1a(tokens[i], 30);
    return tokens;
};

// Map terms to their original token.
module.exports.termsMap = function(text) {
    var tokens = tokenize(text);
    var mapped = {};
    for (var i = 0; i < tokens.length; i++) mapped[fnv1a(tokens[i], 30)] = tokens[i];
    return mapped;
};

// Converts text into a name ID.
// Encodes a modifier based on the first term in the last 8 bits to help cluster
// phrases in shards. Reduces the extent to which phrase shards from fan out,
// reducing IO for real life queries.
module.exports.phrase = function(text) {
    var tokens = tokenize(text);
    var a = fnv1a(tokens.join(' '), 24);
    var b = fnv1a((tokens.length ? tokens[0] : '')) % 256;
    return a + b;
};

// Normalize input text into lowercase, asciified tokens.
module.exports.tokenize = tokenize;

function tokenize(query, lonlat) {
    if (lonlat) {
        var numeric = query
            .split(/[^\.\-\d+]+/i)
            .filter(function(t) { return t.length; })
            .map(function(t) { return parseFloat(t); })
            .filter(function(t) { return !isNaN(t); });
        if (numeric.length === 2) return numeric;
    }

    var converted = unidecode(query);

    return query
        .toLowerCase()
        .replace(/[\^]+/g, '')
        .replace(/[-,]+/g, ' ')
        .split(/[^\w+^\s+]/gi)
        .join('')
        .split(/[\s+]+/gi)
        .filter(function(t) { return t.length; });
}
