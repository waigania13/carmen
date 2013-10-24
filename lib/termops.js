var fnv = require('./fnv'),
    iconv = new require('iconv')
        .Iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE');

// Generate degenerates from a given token.
module.exports.degens = function(token) {
    var length = token.length;
    var degens = {};
    for (var i = 0; !i || (i < length && length - i > 2); i++) {
        var degen = fnv.fnvfold(token.substr(0, length - i), 30);
        degens[degen] = (fnv.fnvfold(token, 30) * 4) + Math.min(i,3);
    }
    return degens;
};

// Converts text into an array of search term hash IDs.
module.exports.terms = function(text) {
    var tokens = tokenize(text);
    for (var i = 0; i < tokens.length; i++) tokens[i] = fnv.fnvfold(tokens[i], 30);
    return tokens;
};

// Map terms to their original token.
module.exports.termsMap = function(text) {
    var tokens = tokenize(text);
    var mapped = {};
    for (var i = 0; i < tokens.length; i++) mapped[fnv.fnvfold(tokens[i], 30)] = tokens[i];
    return mapped;
};

// Converts text into a name ID.
// Appends a suffix based on the first term to help cluster phrases in shards.
// @TODO implement this as actual 24-bit FNV1a per http://www.isthe.com/chongo/tech/comp/fnv/
module.exports.phrase = function(text) {
    var tokens = tokenize(text);
    var a = fnv.fnvfold(tokens.join(' '), 20);
    var b = fnv.fnvfold((tokens.length ? tokens[0] : ''), 30) % 4096;
    return a * 4096 + b;
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

    try {
        var converted = iconv.convert(query).toString();
        query = converted;
    } catch(err) {}

    return query
        .toLowerCase()
        .replace(/[\^]+/g, '')
        .replace(/[-,]+/g, ' ')
        .split(/[^\w+^\s+]/gi)
        .join('')
        .split(/[\s+]+/gi)
        .filter(function(t) { return t.length; });
}
