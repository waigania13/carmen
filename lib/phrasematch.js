var termops = require('./util/termops'),
    token = require('./util/token'),
    ops = require('./util/ops');


// # phrasematch
//
// @param {Object} source a Geocoder datasource
// @param {Array} query a list of terms composing the query to Carmen
// @param {Function} callback called with `(err, features, result, stats)`
module.exports = function phrasematch(source, query, callback) {
    var tokenized = termops.tokenize(token.replaceToken(source._geocoder.token_replacer, query));
    var numTokenized = termops.numTokenize(tokenized);
    var getter = source.getGeocoderData.bind(source);

    // Get permutations of phrases
    var perms = termops.permutations(tokenized);
    for (var i = 0; i < numTokenized.length; i++) {
        perms = perms.concat(termops.permutations(numTokenized[i]));
    }
    perms = termops.uniqPermutations(perms);

    var l = perms.length;
    var toLoad = [];
    while (l--) {
        var phrase = termops.encodePhrase(perms[l], perms[l].ender);
        perms[l].phrase = phrase;
        toLoad.push(phrase);
    }

    source._geocoder.loadall(getter, 'grid', toLoad, function(err) {
        if (err) return callback(err);

        var results = [];

        var l = perms.length;
        while (l--) {
            if (!source._geocoder.exists('grid', perms[l].phrase)) continue;
            // Augment permutations with matched grids,
            // index position and weight relative to input query.
            perms[l].cache = source._geocoder;
            perms[l].idx = source._geocoder.idx;
            perms[l].zoom = source._geocoder.zoom;
            perms[l].weight = perms[l].length / tokenized.length;
            perms[l].shardlevel = source._geocoder.shardlevel;
            results.push(perms[l]);
        }

        return callback(null, results);
    });
};

