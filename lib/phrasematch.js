var termops = require('./util/termops'),
    queue = require('queue-async'),
    token = require('./util/token'),
    ops = require('./util/ops');


// # phrasematch
//
// @param {Object} source a Geocoder datasource
// @param {Array} query a list of terms composing the query to Carmen
// @param {Function} callback called with `(err, features, result, stats)`
module.exports = function phrasematch(source, query, callback) {
    var tokenized = termops.tokenize(token.replaceToken(source._geocoder.token_replacer, query));
    var options = {
        queryLength: tokenized.length,
        getter: source.getGeocoderData.bind(source),
        cache: source._geocoder
    };

    // Get permutations of phrases
    var perms = termops.permutations(tokenized);
    var l = perms.length;
    var toLoad = [];
    while (l--) {
        var phrase = termops.encodePhrase(perms[l], !perms[l].ender);
        perms[l].phrase = phrase;
        toLoad.push(phrase);
    }

    var q = queue();
    options.cache.loadall(options.getter, 'grid', toLoad, function(err) {
        if (err) return callback(err);

        var results = [];

        // Grid results from getall are not used directly as they are loaded
        // async and may be out of order. Recreate the grids array in phrase
        // relevance order -- fast because these are now all cached.
        var l = perms.length;
        while (l--) {
            var grids = options.cache.get('grid', perms[l].phrase);
            if (grids) {
                // Augment permutations with matched grids,
                // index position and weight relative to input query.
                perms[l].grids = grids;
                perms[l].idx = source._geocoder.idx;
                perms[l].zoom = source._geocoder.zoom;
                perms[l].weight = perms[l].length / tokenized.length;
                results.push(perms[l]);
            }
        }

        return callback(null, results);
    });
};

