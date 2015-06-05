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
    getDegen(options, tokenized, callback);
};

// Match last token in the query to degenerates and determine
// the closest real terms to the query input.
function getDegen(options, tokenized, callback) {
    var fragments = termops.terms(tokenized);

    var q = queue();
    // Though only the last token's matching degens are used (prior terms
    // are used directly) they must all be retrieved from cache to ensure
    // there are matching terms at all for the token.
    for (var i = 0; i < fragments.length; i++) q.defer(function(last, fragment, done) {
        options.cache.getall(options.getter, 'degen', [fragment], function(err, degens) {
            if (err) {
                return done(err);
            } else {
                degens.sort(sortDegenDist);
                return done(null, degens.length && !last ? degens.slice(0,1) : degens);
            }
        });
    }, i === fragments.length-1, fragments[i]);

    q.awaitAll(function(err, queryDegens) {
        if (err) return callback(err);
        options.cache.phrasematchDegens(queryDegens, function(err, ret) {
            if (err) return callback(err);
            // maps terms to first index of occurrence in input query.
            options.queryidx = ret.queryidx;
            // maps terms to index(es) in a reason bitmask in input query.
            options.querymask = ret.querymask;
            // maps terms to degenerate distance from canonical terms.
            options.querydist = ret.querydist;

            // include numeric query terms in queryidx/mask/dist
            // even if there were no results for them from the degen index.
            // used for counting these terms in phraseMatchRelev when matching
            // against housenum dataterms.
            for (var i = 0; i < fragments.length; i++) {
                if (!termops.address(tokenized[i])) continue;
                var fragment = fragments[i];
                options.queryidx[fragment] = options.queryidx[fragment] || i;
                options.querymask[fragment] = options.querymask[fragment] || (1 << i);
                options.querydist[fragment] = options.querydist[fragment] || 0;
            }

            getPhrases(options, ret.terms, callback);
        });
    });
}

function sortDegenDist(a, b) { return (a%16) - (b%16); }

// For all terms match phrases that contain the terms.
function getPhrases(options, terms, callback) {
    options.cache.getall(options.getter, 'term', terms, function(err, phrases) {
        if (err) return callback(err);
        getRelevantPhrases(options, phrases, callback);
    });
}

// Filter all phrases down to ones most relevant to the query based
// on their term term weights.
function getRelevantPhrases(options, phrases, callback) {
    options.cache.loadall(options.getter, 'phrase', phrases, function(err, result) {
        if (err) return callback(err);
        options.cache.phrasematchPhraseRelev(options.queryLength, phrases, options.queryidx, options.querymask, options.querydist, function(err, ret) {
            if (err) return callback(err);
            getGrids(options, ret.result, ret.relevs, callback);
        });
    });
}

// Load tile-cover grids the most relevant phrases.
// Turn each feature id in tile cover grids into a feature relev object
// with the relev score from the phrase contributing to its match.
function getGrids(options, phrases, relevs, callback) {
    options.cache.loadall(options.getter, 'grid', phrases, function(err, result) {
        if (err) return callback(err);

        // Grid results from getall are not used directly as they are loaded
        // async and may be out of order. Recreate the grids array in phrase
        // relevance order -- fast because these are now all cached.
        var grids = [];
        for (var i = 0; i < phrases.length; i++) {
            grids.push.apply(grids, options.cache.get('grid', phrases[i]));
        }

        return callback(null, {
            phrases: phrases,
            grids: grids,
            relevs: relevs
        });
    });
}
