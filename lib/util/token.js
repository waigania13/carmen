var removeDiacritics = require('./remove-diacritics');
var XRegExp = require('xregexp');

module.exports.createReplacer = function(tokens, includeUnambiguousReverse) {
    var replacers = [];
    let isReverse = {};

    if (includeUnambiguousReverse) {
        // go through the keys and if check if their values are unique; if so,
        // include them backwards as well
        let values = {}
        for (let token in tokens) {
            if (values[tokens[token]]) {
                values[tokens[token]].push(token);
            } else {
                values[tokens[token]] = [token];
            }
        }
        for (let value in values) {
            if (values[value].length == 1 && !tokens[value] && ! value.match(/[\(\)\$]/)) {
                let clone = "" + values[value][0];
                tokens[value] = clone;
                isReverse[value] = true;
            }
        }
    }
    for (var token in tokens) {
        var from = token; // normalize expanded
        var to = tokens[token];
        let reverse = !!isReverse[from];

        for (var u = 0; u < 2; u++) {
            if (u) {
                var stripped = removeDiacritics(from);
                if (from === stripped) {
                    continue;
                } else {
                    from = stripped;
                }
            }

            var entry = {};
            var parsedFrom = new XRegExp(from);
            entry.named = (parsedFrom.xregexp.captureNames !== null);

            // ensure that named groups are all or nothing; otherwise we have order problems
            if (entry.named && parsedFrom.xregexp.captureNames.some(function(captureName) { return captureName === null; }))
                throw new Error('Cannot process \'%s\'; must use either named or numbered capture groups, not both', from);

            if (entry.named) {
                entry.from = new XRegExp('(?<tokenBeginning>\\W|^)' + from + '(?<tokenEnding>\\W|$)', 'gi');
                entry.to = '${tokenBeginning}' + to + '${tokenEnding}';
            }
            else {
                entry.from = new RegExp('(\\W|^)' + from + '(\\W|$)', 'gi');

                // increment replacements indexes in `to`
                var groupReplacements = 0;
                to = to.replace(/\$(\d+)/g, function(str, index) { groupReplacements++; return '$' + (parseInt(index)+1).toString();});
                entry.to = '$1' + to + '$' + (groupReplacements + 2).toString(); // normalize abbrev
            }

            entry.reverse = reverse;
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

module.exports.enumerateTokenReplacements = function(tokens, query) {
    let out = [query];
    for (var i=0; i<tokens.length; i++) {
        for (let j = 0; j < out.length; j++) {
            if (typeof out[j] != "string") continue;

            let match = tokens[i].named ?
                XRegExp.match(out[j], tokens[i].from) :
                out[j].match(tokens[i].from);

            if (match) {
                let subOut = [out[j]];
                for (let m of match) {
                    let subStr = subOut.pop();

                    let parts = subStr.split(m);
                    // match may have duplicates in it, so we only want to
                    // examine one split at a time; unfortunately the string
                    // split API in JS is awful, so we have to emulate
                    // proper split limiting
                    if (parts.length > 2) parts = [parts[0], parts.slice(1).join(m)];

                    subOut.push(parts[0]);

                    let choices = [
                        tokens[i].named ?
                            XRegExp.replace(m, tokens[i].from, tokens[i].to) :
                            m.replace(tokens[i].from, tokens[i].to),
                        m
                    ];
                    // return short forms first so if we truncate, we always get
                    // the short ones -- this is important because forward geocoding
                    // will only ever use the short ones
                    if (tokens[i].reverse) choices.reverse();

                    subOut.push(choices);

                    subOut.push(parts[1]);
                }
                // we've now turned a string that was an element in our main
                // output array into another array, so splice it into place
                // to replace the original string
                out = out.slice(0, j).concat(subOut).concat(out.slice(j + 1));
            }
        }
    }

    return out;
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
