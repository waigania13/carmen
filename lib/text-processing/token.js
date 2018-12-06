'use strict';
const removeDiacritics = require('./remove-diacritics');
const XRegExp = require('xregexp');

// this is all punctuation including unicode punctuation, plus all whitespace
const WORD_BOUNDARY = "[\\s\\u2000-\\u206F\\u2E00-\\u2E7F\\\\'!\"#$%&()*+,\\-.\\/:;<=>?@\\[\\]^_`{|}~]";

/**
 * An individual pattern-based replacement configuration.
 *
 * @access public
 *
 * @typedef {Object} ReplaceRule
 * @property {boolean} named - does the pattern use a named capturing group?
 * @property {RegExp} from - pattern to match in a string
 * @property {RegExp|false} fromLastWord - if from is a simple token replacement,
 * pattern to detect if the last word has been simple token replaced. False for complex
 * token replacements.
 * @property {string} to - replacement string (possibly including group references)
 * @property {boolean} inverse - include the opposite tokenization
 */


/**
 * Create a per-token replacer
 *
 * @access public
 * @name createReplacer
 *
 * @param {object} tokens - tokens
 * @param {object} inverseOpts - options for inverting token replacements
 * @param {object} inverseOpts.includeUnambiguous - options for
 * @returns {Array<ReplaceRule>} an array of replace rules

 */
module.exports.createReplacer = function(tokens, inverseOpts) {
    // opts
    tokens = JSON.parse(JSON.stringify(tokens));
    inverseOpts = inverseOpts || {};
    inverseOpts.includeUnambiguous = inverseOpts.includeUnambiguous || false;

    const replacers = [];
    const isInverse = {};
    const isCustom = {};

    if (inverseOpts.includeUnambiguous) {
        // go through the keys and if check if their values are unique; if so,
        // include them backwards as well
        const tos = {};
        for (const _from in tokens) {
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
        for (const to in tos) {
            if (tos[to].length === 1 && !tokens[to] && ! to.match(/[\(\)\$]/)) {
                const clone = JSON.parse(JSON.stringify(tos[to][0]));
                tokens[to] = clone;
                isInverse[to] = true;
            }
        }
    }
    if (inverseOpts.custom) {
        for (const token in inverseOpts.custom) {
            tokens[token] = inverseOpts.custom[token];
            isInverse[token] = true;
            isCustom[token] = true;
        }
    }
    for (const token in tokens) {
        let from = token; // normalize expanded
        let orig_to = tokens[token];

        let replacementOpts = {};
        if (typeof orig_to == 'object' && orig_to.text) {
            replacementOpts = orig_to;
            orig_to = orig_to.text;
        }

        const inverse = !!isInverse[from];

        for (let u = 0; u < 2; u++) {
            // first add the non-unidecoded version to the token replacer, then,
            // if unidecode changes the string, add it again
            if (u) {
                const stripped = removeDiacritics(from);
                if (from === stripped || replacementOpts.skipDiacriticStripping) {
                    continue;
                } else {
                    from = stripped;
                }
            }

            const entry = {};
            const parsedFrom = new XRegExp(from);
            entry.named = (parsedFrom.xregexp.captureNames !== null);

            // ensure that named groups are all or nothing; otherwise we have order problems
            if (entry.named && parsedFrom.xregexp.captureNames.some((captureName) => { return captureName === null; })) {
                throw new Error('Cannot process \'%s\'; must use either named or numbered capture groups, not both', from);
            }
            // true if the regex rule replaces part of the matched word,
            // substrings wherever they appear in the word,
            // or uses a custom replacement function
            const complex = (replacementOpts.skipBoundaries ||
                (typeof orig_to == 'string' && /\$(\d+|{\w+})/.test(orig_to)) ||
                isCustom[token]) ||
                false;

            if (entry.named) {
                entry.from = new XRegExp(
                    '(?<tokenBeginning>' + WORD_BOUNDARY + '|^)' +
                    from.replace('.', '\\.') +
                    '(?<tokenEnding>' + WORD_BOUNDARY + '|$)',
                    'gi');
                entry.fromLastWord = complex ? false :
                    new XRegExp(
                        '(?<tokenBeginning>' + WORD_BOUNDARY + '|^)' +
                        from.replace('.', '\\.') +
                        '(?<tokenEnding>' + WORD_BOUNDARY + '*)$',
                        'i');
                entry.to = typeof orig_to == 'string' ? '${tokenBeginning}' + orig_to + '${tokenEnding}' : orig_to;
            } else {
                entry.from = new RegExp(
                    (replacementOpts.skipBoundaries ? '' : '(' + WORD_BOUNDARY + '|^)') +
                    from.replace('.', '\\.') +
                    (replacementOpts.skipBoundaries ? '' : '(' + WORD_BOUNDARY + '|$)'),
                    'gi');
                entry.fromLastWord = complex ? false :
                    new RegExp(
                        '(' + WORD_BOUNDARY + '|^)' +
                        from.replace('.', '\\.') +
                        '(' + WORD_BOUNDARY + '*)$',
                        'i');
                // count groups in original regex, using the trick from https://stackoverflow.com/a/16046903
                const count = new RegExp(from + '|').exec('').length - 1;

                // increment replacements indexes in `to`
                if (typeof orig_to == 'string' && !replacementOpts.skipBoundaries) {
                    const new_to = orig_to.replace(/\$(\d+)/g, (str, index) => {
                        return '$' + (parseInt(index) + 1).toString();
                    });

                    entry.to = '$1' + new_to + '$' + (count + 2).toString(); // normalize abbrev
                } else {
                    entry.to = orig_to; // normalize abbrev
                }
            }

            entry.inverse = inverse;
            replacers.push(entry);
        }
    }
    return replacers;
};

/**
 * Replace tokens in a given string
 *
 * @param {Array} tokens - an array of token replacement regex rules
 * @param {String} query - a query string
 * @returns {Object} - replacement object containing a query property, the
 * token-replaced query and boolean indicating
 * whether the last word in the query was replaced or not
 */
module.exports.replaceToken = function(tokens, query) {
    let abbr = query;
    let lastWord = false;
    for (const token of tokens) {
        abbr = abbr.trim();
        if (!lastWord && token.fromLastWord && abbr.match(token.fromLastWord))
            lastWord = true;
        if (token.named)
            abbr = XRegExp.replace(abbr, token.from, token.to);
        else
            abbr = abbr.replace(token.from, token.to);
    }
    return { query: abbr, lastWord: lastWord };
};

module.exports.enumerateTokenReplacements = function(tokens, query) {
    // maintain two lists of the output, one ordered (because the order matters)
    // and one set, so we can easily test to see if the new string is one we've
    // seen before

    const out = [query.trim()];
    const outSet = new Set([query.trim().toLowerCase()]);

    for (const token of tokens) {
        for (let i = 0; i < out.length; i++) {
            // escape hatch on the check to make sure we don't run away with infinite recursion
            if (i > 64) break;

            // we want to enumerate each possible replacement of each token, unless it's an XRegExp, where this whole trick doesn't work
            const occurrenceCount = token.named ? 1 : (out[i].match(token.from) || []).length;

            // we add replacements before the string we replaced into for most replacements
            // because it's "more canonical" I guess? unless the token is inverse
            // in which case we add it after since the text we have is the canonical text
            let insertPos = token.inverse ? i + 1 : i;
            let replaced;

            // Optimized code path if there's only one occurrence of `from`
            // Does not need to support positional replacement
            if (occurrenceCount === 1) {
                if (token.named) {
                    replaced = XRegExp.replace(out[i], token.from, token.to);
                } else {
                    replaced = out[i].replace(token.from, token.to);
                }
                if (replaced !== out[i] && !outSet.has(replaced.toLowerCase())) {
                    out.splice(insertPos, 0, replaced);
                    outSet.add(replaced.toLowerCase());
                }
                continue;
            }

            // More expensive code path for supporting positional replacement
            for (let j = 0; j < occurrenceCount; j++) {
                let occurrence = 0;

                replaced = out[i].replace(token.from, function(match) {
                    let out;
                    if (occurrence === j) {
                        const args = Array.from(arguments);
                        out = typeof token.to == 'function' ?
                            token.to.apply(this, args) :
                            // this replaces the '$n' params with the parenthesized matches
                            token.to.replace(/\$(\d)/g, (match, p1) => {
                                const group = parseInt(p1);
                                return group < (args.length - 2) ? args[parseInt(p1)] : '';
                            });
                    } else {
                        out = match;
                    }
                    occurrence++;
                    return out;
                });

                if (replaced !== out[i] && !outSet.has(replaced.toLowerCase())) {
                    out.splice(insertPos, 0, replaced);
                    outSet.add(replaced.toLowerCase());
                    insertPos++;
                }
            }
        }
    }

    return out;
};


/**
 * A mapping from patterns (keys) to replacements (values).
 *
 *   - The patterns are used in {@link createGlobalReplacer} to create `XRegExp`s (case-insensitive)
 *   - Patterns can match anywhere in a string, regardless of whether the match is a full word, multiple words, or part of a word.
 *   - Matching substrings are replaced with the associated replacement
 *
 * This map is used on input strings at both query and index time.
 *
 * **Example use case: Abbreviating multiple words:**
 *
 * There are a lot of different ways to write "post office box" in US Addresses. You can normalize them with a pattern replace entry:
 *
 * ```javascript
 * patternReplaceMap = {
 *     "\\bP\\.?\\ ?O\\.? Box ([0-9]+)\\b": " pob-$1 "
 * }
 *
 * // "P.O. Box 985" -> "pob-985"
 * // "PO Box 985"   -> "pob-985"
 * // "p.o. box 985" -> "pob-985"
 * ```
 *
 * @typedef {Object<string, string>} PatternReplaceMap
 * @access public
 */

/**
 * Create an array of {@link ReplaceRule}s from a {@link PatternReplaceMap}.
 *
 * @access public
 * @name createGlobalReplacer
 *
 * @param {PatternReplaceMap} tokens - a pattern-based string replacement specification
 * @returns {Array<ReplaceRule>} an array of rules for replacing substrings
 */
module.exports.createGlobalReplacer = function(tokens) {
    const replacers = [];

    for (const token in tokens) {
        const from = token;
        const to = tokens[token];

        const entry = {
            named: false,
            from: new RegExp(from, 'gi'),
            to: to
        };
        replacers.push(entry);
    }
    return replacers;
};
