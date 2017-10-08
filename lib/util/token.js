var uniq = require('./uniq');
var removeDiacritics = require('./remove-diacritics');
var XRegExp = require('xregexp');

// this is all punctuation including unicode punctuation, plus all whitespace
const WORD_BOUNDARY = "[\\s\\u2000-\\u206F\\u2E00-\\u2E7F\\\\'!\"#$%&()*+,\\-.\\/:;<=>?@\\[\\]^_`{|}~]";

module.exports.createReplacer = function(tokens, inverseOpts) {
    // opts
    tokens = JSON.parse(JSON.stringify(tokens));
    inverseOpts = inverseOpts || {};
    inverseOpts.includeUnambiguous = inverseOpts.includeUnambiguous || false;

    let isInverse = {};

    if (inverseOpts.includeUnambiguous) {
        // go through the keys and if check if their values are unique; if so,
        // include them backwards as well
        let tos = {}
        for (let _from in tokens) {
            let to, from;
            if (typeof tokens[_from] == 'object') {
                to = tokens[_from].text;
                from = JSON.parse(JSON.stringify(tokens[_from]));
                from.text = _from;
            } else {
                from = _from;
                to = tokens[from];
            }
            if (tos[to]) {
                tos[to].push(from);
            } else {
                tos[to] = [from];
            }
        }
        for (let to in tos) {
            if (tos[to].length == 1 && !tokens[to] && ! to.match(/[\(\)\$]/)) {
                let clone = JSON.parse(JSON.stringify(tos[to][0]));
                tokens[to] = clone;
                isInverse[to] = true;
            }
        }
    }
    if (inverseOpts.custom) {
        for (let token in inverseOpts.custom) {
            tokens[token] = inverseOpts.custom[token];
            isInverse[token] = true;
        }
    }

    const groups = {
        forward: {
            skipBoundaries: { fromList:[], tokens:{} },
            withBoundaries: { fromList:[], tokens:{} }
        },
        inverse: {
            skipBoundaries: { fromList:[], tokens:{} },
            withBoundaries: { fromList:[], tokens:{} }
        }
    };

    for (let from in tokens) {
        let to = tokens[from];
        let mode = !!isInverse[from] ? 'inverse' : 'forward';
        let replacementOpts = typeof to === 'object' ? to : {};
        let toText = typeof to === 'object' ? to.text : to;

        for (var u = 0; u < 2; u++) {
            // first add the non-unidecoded version to the token replacer, then,
            // if unidecode changes the string, add it again
            if (u) {
                var stripped = removeDiacritics(from);
                if (from === stripped || replacementOpts.skipDiacriticStripping) {
                    continue;
                } else {
                    from = stripped;
                }
            }

            let boundaries = replacementOpts.skipBoundaries ? 'skipBoundaries' : 'withBoundaries';
            groups[mode][boundaries].fromList.push(from);
            groups[mode][boundaries].tokens[from.toLowerCase()] = toText;
        }
    }

    const replacer = [];

    if (groups.forward.withBoundaries.fromList.length) {
        replacer.push({
            from: new RegExp(
                `(${WORD_BOUNDARY}|^)(` +
                groups.forward.withBoundaries.fromList.map((str) => { return str.replace('.','\\.'); }).join('|') +
                `)(${WORD_BOUNDARY}|$)`,
            'i'),
            to: function() {
                let from = arguments[2].toLowerCase();
                return `${arguments[1]}${groups.forward.withBoundaries.tokens[from]}${arguments[3]}`;
            }
        });
    }

    if (groups.forward.skipBoundaries.fromList.length) {
        replacer.push({
            from: new RegExp(
                groups.forward.skipBoundaries.fromList.map((str) => { return str.replace('.','\\.'); }).join('|'),
            'i'),
            to: function() {
                let from = arguments[0].toLowerCase();
                return groups.forward.skipBoundaries.tokens[from];
            }
        });
    }

    return replacer;
};

module.exports.replaceToken = function(tokens, query) {
    var abbr = query;
    for (let token of tokens) {
        abbr = abbr.trim();
        if (token.named)
            abbr = XRegExp.replace(abbr, token.from, token.to);
        else
            abbr = abbr.replace(token.from, token.to);
    }

    return abbr;
}

module.exports.enumerateTokenReplacements = function enumerateTokenReplacements(tokens, query, offset, out) {
    // maintain two lists of the output, one ordered (because the order matters)
    // and one set, so we can easily test to see if the new string is one we've
    // seen before
    query = query.trim();
    offset = offset || 0;

    let root = false;

    if (!out) {
        out = [query];
        root = true;
    }

    for (let i = 0; i < tokens.length; i++) {
        let replacer = tokens[i];
        var match = query.substr(offset).match(replacer.from);
        if (match) {
            // add the replaced version to the list
            let replaced = query.substr(0, offset) + query.substr(offset).replace(replacer.from, replacer.to);
            out.push(replaced);
            // recurse using the replaced version
            enumerateTokenReplacements(tokens, replaced, offset, out);
            // recurse using the normal version, skipping this replacement
            enumerateTokenReplacements(tokens, query, offset + match.index + match[0].length, out);
        }
    }

    return root ? uniq(out) : out;
}

module.exports.createGlobalReplacer = function(tokens) {
    var replacers = [];

    for (var token in tokens) {
        var from = token;
        var to = tokens[token];

        var entry = {
            named: false,
            from: new RegExp(from, 'gi'),
            to: to
        };
        replacers.push(entry);
    }
    return replacers;
}
