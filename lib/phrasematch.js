var termops = require('./util/termops'),
    queue = require('queue-async'),
    ops = require('./util/ops'),
    uniq = require('./util/uniq'),
    Relev = require('./util/relev');

var idmod = Math.pow(2,25);

// # phrasematch
//
// @param {Object} source a Geocoder datasource
// @param {Number} dbidx index of the source in the geocoder config
// @param {Array} query a list of terms composing the query to Carmen
// @param {Function} callback called with `(err, features, result, stats)`
module.exports = function phrasematch(source, dbidx, query, callback) {
    var options = {
        getter: source.getGeocoderData.bind(source),
        cache: source._geocoder,
        dbid: source._geocoder.id,
        dbname: source._geocoder.name,
        dbidx: dbidx
    };
    var terms = termops.terms(termops.tokenMap(source._geocoder.geocoder_tokens, termops.tokenize(query)));
    getDegen(options, terms, callback);
};

// Match all tokens in the query to degenerates and determine
// the closest real terms to the query input.
function getDegen(options, query, callback) {
    var q = queue();
    for (var i = 0; i < query.length; i++) q.defer(function(token, done) {
        options.cache.getall(options.getter, 'degen', [token], done);
    }, query[i]);

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
            getPhrases(options, ret.terms, callback);
        });
    });
}

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
    options.cache.getall(options.getter, 'phrase', phrases, function(err, result) {
        if (err) return callback(err);
        options.cache.phrasematchPhraseRelev(phrases, options.queryidx, options.querymask, options.querydist, function(err, ret) {
            if (err) return callback(err);
            getGrids(options, ret.result, ret.relevs, callback);
        });
    });
}

// Load tile-cover grids the most relevant phrases.
// Turn each feature id in tile cover grids into a feature relev object
// with the relev score from the phrase contributing to its match.
function getGrids(options, phrases, relevs, callback) {
    options.cache.getall(options.getter, 'grid', phrases, function(err, result) {
        if (err) return callback(err);

        var features = {},
            docrelev = {},
            phrase, relev, grids,
            grid, feat;

        // Associate the relevance score of each phrase with its
        // associated features.
        for (var a = 0; a < phrases.length; a++) {
            phrase = phrases[a];
            relev = relevs[phrase];
            grids = options.cache.get('grid', phrase);
            for (var i = 0; i < grids.length; i++) {
                feat = grids[i] % idmod;
                if (!features[feat] || docrelev[feat] < relev.tmprelev) {
                    features[feat] = new Relev(feat,
                        relev.relev,
                        relev.reason,
                        relev.count,
                        options.dbidx,
                        options.dbid,
                        options.dbname,
                        options.dbidx * 1e14 + feat);
                    docrelev[feat] = relev.tmprelev;
                }
            }
        }

        return callback(null, features, result);
    });
}

