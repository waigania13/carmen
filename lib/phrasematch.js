var termops = require('./util/termops');
var token = require('./util/token');

// # phrasematch
//
// @param {Object} source a Geocoder datasource
// @param {Array} query a list of terms composing the query to Carmen
// @param {Function} callback called with `(err, features, result, stats)`
module.exports = function phrasematch(source, query, callback) {
    var tokenized = termops.tokenize(token.replaceToken(source._geocoder.token_replacer, query));
    var getter = source.getGeocoderData.bind(source);

    // Get all subquery permutations from the query
    var subqueries = termops.permutations(tokenized);

    // Include housenum tokenized permutations if source has addresses
    if (source._geocoder.geocoder_address) {
        var numTokenized = termops.numTokenize(tokenized);
        for (var i = 0; i < numTokenized.length; i++) {
            subqueries = subqueries.concat(termops.permutations(numTokenized[i]));
        }
    }

    subqueries = termops.uniqPermutations(subqueries);

    var l = subqueries.length;
    var toLoad = [];
    while (l--) {
        var phrase = termops.encodePhrase(subqueries[l], subqueries[l].ender);
        subqueries[l].phrase = phrase;
        toLoad.push(phrase);
    }

    source._geocoder.loadall(getter, 'grid', toLoad, function(err) {
        if (err) return callback(err);

        var results = [];

        var l = subqueries.length;
        while (l--) {
            if (!source._geocoder.exists('grid', subqueries[l].phrase)) continue;
            // Augment permutations with matched grids,
            // index position and weight relative to input query.
            subqueries[l].cache = source._geocoder;
            subqueries[l].idx = source._geocoder.idx;
            subqueries[l].zoom = source._geocoder.zoom;
            subqueries[l].nmask = 1 << source._geocoder.ndx;
            subqueries[l].weight = subqueries[l].length / tokenized.length;
            subqueries[l].shardlevel = source._geocoder.shardlevel;
            results.push(subqueries[l]);
        }

        return callback(null, results);
    });
};

