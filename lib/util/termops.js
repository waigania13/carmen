var mp4 = Math.pow(2,4);
var mp8 = Math.pow(2,8);
var mp20 = Math.pow(2,20);
var mp28 = Math.pow(2,28);
var mp32 = Math.pow(2,32);
var mp52 = Math.pow(2,52);
var unidecode = require('unidecode');
var idPattern = /^(\S+)\.([0-9]+)$/;
var token = require('./token');

module.exports.address = address;
module.exports.maskAddress = maskAddress;
module.exports.parseSemiNumber = parseSemiNumber;
module.exports.getHousenumRange = getHousenumRange;
module.exports.fnv1a = fnv1a;
module.exports.encodeDegen = encodeDegen;
module.exports.encodeTerm = encodeTerm;
module.exports.encodeData = encodeData;
module.exports.decodeData = decodeData;
module.exports.isDataTerm = isDataTerm;

//Checks if the query is requesting a specific feature by its id
//province.### address.### etc.
module.exports.id = function(indexes, query) {
    var matches = query.match(idPattern);

    if (!matches) return false;

    var dbname = matches[1];
    var id = matches[2];

    if (!indexes[dbname]) return false;

    return {dbname:dbname, id:id};
};

// Generate degenerates from a given token.
module.exports.degens = function(token) {
    var length = token.length;
    var tokenid = encodeDegen(token);
    if (tokenid === false) return [];

    var degens = [tokenid, tokenid];

    // Don't generate degens for numeric components.
    if (parseSemiNumber(address(token)) !== null) return degens;

    // Iterate through subsets of each term to generate degens.
    for (var i = 1; !i || (i < length && length - i > 1); i++) {
        var degen = encodeDegen(token.substr(0, length - i));
        var degenDist = encodeDegen(token, Math.min(i,15));
        degens.push(degen);
        degens.push(degenDist);
    }

    return degens;
};

// Converts text into an array of search term hash IDs.
module.exports.terms = function(tokens) {
    var terms = []; // tokenize(text);
    for (var i = 0; i < tokens.length; i++) {
        terms[i] = encodeTerm(tokens[i]);
    }
    return terms;
};

// Converts text into an array of search term hash IDs with encoded integer
// weights based on IDF term frequency.
module.exports.termsWeighted = function(tokens, freq) {
    var terms = [];
    var weights = [];
    var total = freq[0][0] || 1;
    var termfreq;
    var maxweight = 0;

    for (var i = 0; i < tokens.length; i++) {
        terms[i] = encodeTerm(tokens[i], 0);
        termfreq = freq[terms[i]] ? freq[terms[i]][0] : 1;
        weights[i] = Math.log(1 + total/termfreq);
        maxweight = Math.max(maxweight, weights[i]);
    }
    for (i = 0; i < tokens.length; i++) {
        terms[i] = terms[i] + Math.max(1,Math.floor(weights[i]/maxweight*15));
    }
    return terms;
};

// Map terms to their original token.
module.exports.termsMap = function(tokens) {
    var mapped = {};
    for (var i = 0; i < tokens.length; i++) mapped[encodeTerm(tokens[i])] = tokens[i];
    return mapped;
};

// Converts text into a name ID.
// Encodes a modifier based on the first term in the last 8 bits to help cluster
// phrases in shards. Reduces the extent to which phrase shards from fan out,
// reducing IO for real life queries.
module.exports.phrase = function(tokens, cluster) {
    var a = fnv1a(tokens.join(' ')) % mp20;
    var b = fnv1a(cluster) >>> 20 << 20 >>> 0;
    return a + b;
};

// Generate a hash id from a feature ID. Fits within a 25-bit integer space
// to be encoded cleanly into zxy values (see ops.zxy).
module.exports.feature = function(id) {
    return Math.abs(parseInt(id,10)) % Math.pow(2,25);
};

// Normalize input text into lowercase, asciified tokens.
module.exports.tokenize = tokenize;


/**
 * tokenize - Acceps a query string or lonlat and returns a tokenized array
 *
 * @param  {String} query  A string to tokenize
 * @param  {String} lonlat A lon,lat pair to tokenie
 * @return {Array}         A tokenized array
 */
function tokenize(query, lonlat) {
    if (lonlat) {
        var numeric = query
            .split(/[^\.\-\d+\w+]/i)
            .filter(function(t) { return t.length; });
        if (numeric.length === 2) {
            numeric = numeric
                .map(function(t) {
                    if (!(/^[0-9\.\-]+$/).test(t)) return false;
                    var float = parseFloat(t);
                    return !isNaN(float) ? float : false;
                })
                .filter(function(t) {
                    return t !== false && !isNaN(t);
                });
        }
        if (numeric.length === 2) return numeric;
    }

    var normalized = unidecode(query)
        .toLowerCase()
        .replace(/[\^]+/g, '')
        .replace(/[,]+/g, ' ')
        .replace(/[^\w+^\s+^-]/gi, '')
        .split(/[\s+]+/gi);

    var pretokens = [];

    for(i=0;i<normalized.length;i++){
        if (/(\d+)-(\d+)[a-z]?/.test(normalized[i])){
            pretokens.push(normalized[i]);
        } else {
            var splitPhrase = normalized[i].split('-');
            pretokens = pretokens.concat(splitPhrase);
        }
    }

    var tokens = [];

    for (var i = 0; i < pretokens.length; i++) {
        if (pretokens[i].length) {
            tokens.push(pretokens[i]);
        }
    }

    return tokens;
}

/**
 * maskAddress - finds an address given the bitmask of a query
 * This ensures that an address is only used if it does not currently
 * match any of the currently matched features in teh bitmask and it
 * is a valid address
 *
 * @param query {Array} tokenized query
 * @param relev {Integer} a mask for the given query
 * @return {Object} returns an address object or null
*/
function maskAddress(query, mask) {
    for (var i = 0; i < query.length; i++ ) {
        if (mask & (1 << i)) {
            var addr = address(query[i]);
            if (addr) return {addr: addr, pos: i};
        }
    }
    return null;
}

/**
 * address - finds an address giving a single string token
 *
 * @param  {String} token a single String query token
 * @return {String}       Returns a string of the address or null
 */
function address(token) {
    if (typeof token === 'string' && (/^\d+[a-z]?$/.test(token) || /^(\d+)-(\d+)[a-z]?$/.test(token))) {
        return token;
    } else {
        return null;
    }
}

// Get the min + max housenum range for a doc with _cluster or _rangetype
// housenumber properties.
function getHousenumRange(doc) {
    var snap = 1000;
    var min = Infinity;
    var max = -Infinity;
    if (doc._cluster) {
        var keys = typeof doc._cluster === 'string' ?
            Object.keys(JSON.parse(doc._cluster)) :
            Object.keys(doc._cluster);
        for (var i = 0; i < keys.length; i++) {
            var housenum = parseSemiNumber(keys[i]);
            if (housenum !== null && housenum < min) min = housenum;
            if (housenum !== null && housenum > max) max = housenum;
        }
    } else if (doc._rangetype) {
        var props = ['_lfromhn', '_ltohn', '_rfromhn', '_rtohn'];
        for (var p = 0; p < props.length; p++) {
            if (!doc[props[p]]) continue;
            var prop = Array.isArray(doc[props[p]]) ? doc[props[p]] : [doc[props[p]]];
            for (var i = 0; i < prop.length; i++) {
                var housenum = parseSemiNumber(prop[i]);
                if (housenum !== null && housenum < min) min = housenum;
                if (housenum !== null && housenum > max) max = housenum;
            }
        }
    }
    return isFinite(min) && isFinite(max) ? {
        type: 'range',
        min: Math.min(mp20-1,Math.max(0,Math.floor(min/snap)*snap)),
        max: Math.min(mp20-1,Math.max(0,Math.ceil(max/snap)*snap))
    } : false;
}

// Takes a geocoder_tokens token mapping and a text string and returns
// an array of one or more arrays of tokens that should be indexed.
module.exports.getIndexableText = function(replacer, doc) {
    var uniqTexts = {};
    var indexableText = [];
    var texts = doc._text.split(',');
    for (var x = 0; x < texts.length; x++) {
        // push tokens with replacements
        var tokens = tokenize(token.replaceToken(replacer, texts[x]));

        // push tokens with housenum range token if applicable
        var range = getHousenumRange(doc);
        if (range) {
            add([JSON.stringify(range)].concat(tokens));
            add(tokens.concat([JSON.stringify(range)]));
        } else {
            add(tokens);
        }
    }
    function add(tokens) {
        var key = tokens.join(' ');
        if (!tokens.length || uniqTexts[key]) return;
        uniqTexts[key] = true;
        indexableText.push(tokens);
    }
    return indexableText;
};

function parseSemiNumber(_) {
    _ = parseInt((_ || '').replace(/[^\d]/g,''),10);
    return isNaN(_) ? null : _;
}

// # [FNV](https://en.wikipedia.org/wiki/Fowler%E2%80%93Noll%E2%80%93Vo_hash_function)
// hash is a simple non-cryptographic hash.
//
// FNV-1a hash.
// Defaults to a 32 bit unsigned int from a string. Optional second argument
// specifies number of bits to be kept, clearing out the remaining as 0s.
// For 32-bit: offset = 2166136261, prime = 16777619.
function fnv1a(str, bits) {
    var hash = 0x811C9DC5;
    if (str.length) for (var i = 0; i < str.length; i++) {
        hash = hash ^ str.charCodeAt(i);
        // 2**24 + 2**8 + 0x93 = 16777619
        hash += (hash << 24) + (hash << 8) + (hash << 7) + (hash << 4) + (hash << 1);
    }
    if (bits) {
        var clear = 32 - bits;
        hash = hash >>> clear << clear;
    }
    return hash >>> 0;
}

function encodeDegen(text, distance) {
    distance = distance || 0;
    var number = parseSemiNumber(address(text));

    if (text[0] === '{') {
        return false;
    } else if (number !== null && number < mp28) {
        return (number * mp4) + distance;
    } else {
        return fnv1a(text, 28) + distance;
    }
}

function encodeTerm(text, weight) {
    weight = weight || 0;
    var number = parseSemiNumber(address(text));

    if (text[0] === '{') {
        // Dataterms are basically unique in the IDF and
        // thus don't get weighted properly. This value
        // is somewhat arbitrary and meant to be the smallest
        // value possibly that has an impact on phraseMatchRelev
        // relev scores. Too low, however, and it gets flattened
        // out to 0 (weight % of total < 1/32).
        weight = 4;
        return encodeData(JSON.parse(text)) + weight;
    } else if (number !== null && number < mp28) {
        return (number * mp4) + weight;
    } else {
        return fnv1a(text, 28) + weight;
    }
}

function encodeData(obj) {
    var types = { range: 0 };
    var encoded = mp52;
    var type = types[obj.type];
    if (type === undefined) throw new Error('Unknown type ' + obj.type);
    if (obj.max < 0 || obj.max >= mp20) throw new Error('Range max must be between 0-' + (mp20 - 1));
    if (obj.min < 0 || obj.min >= mp20) throw new Error('Range min must be between 0-' + (mp20 - 1));
    encoded += type * mp4;
    encoded += obj.min * mp8;
    encoded += obj.max * mp28;
    return encoded;
}

function decodeData(num) {
    var types = { 0: 'range' };
    var type = Math.floor((num % mp8)/mp4);
    var min = Math.floor((num % mp28)/mp8);
    var max = Math.floor((num % mp52)/mp28);
    return {
        type: types[type],
        min: min,
        max: max
    };
}

function isDataTerm(num) {
    return num >= mp32;
}

