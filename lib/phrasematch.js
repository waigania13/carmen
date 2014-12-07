var termops = require('./util/termops'),
    queue = require('queue-async'),
    ops = require('./util/ops'),
    uniq = require('./util/uniq'),
    Relev = require('./util/relev');

var idmod = Math.pow(2,25);

// # phrasematch
//
// @param {Object} source a Geocoder datasource
// @param {Number} sourceidx index of the source in the geocoder config
// @param {Array} query a list of terms composing the query to Carmen
// @param {Function} callback called with `(err, features, result, stats)`
module.exports = function phrasematch(source, sourceidx, query, callback) {
    var dbid = source._geocoder.id,
        dbname = source._geocoder.name,
        terms = termops.terms(termops.tokenMap(source._geocoder.geocoder_tokens, termops.tokenize(query))),
        relevs = {},
        // statistics, stored as
        // [call count, result length, call time]
        stats = {
            degen: [0,0,0],
            phrase: [0,0,0],
            term: [0,0,0],
            relevd: [0,0,0],
            grid: [0,0,0]
        },
        // maps terms to first index of occurrence in input query.
        queryidx,
        // maps terms to index(es) in a reason bitmask in input query.
        querymask,
        // maps terms to degenerate distance from canonical terms.
        querydist,
        docrelev = {};

    getDegen(terms, function degenDone(err, terms) {
        if (err) return callback(err);
        getPhrases(terms, function phrasesDone(err, phrases) {
            if (err) return callback(err);
            getRelevantPhrases(phrases, function termsDone(err, relevantPhrases) {
                if (err) return callback(err);
                getgrids(relevantPhrases, function gridsDone(err, features, result) {
                    if (err) return callback(err);
                    return callback(null, features, result, stats);
                });
            });
        });
    });

    // First, for all of the terms searched, get degenerate variations
    // from the geocoder source.
    //
    // @param {Array} tokenized query to load degens for
    // @param {Function} callback called with `(err, result)`
    function getDegen(query, callback) {
        stats.degen[0]++;
        stats.degen[2] = +new Date();

        var q = queue();
        var getter = source.getGeocoderData.bind(source);
        for (var i = 0; i < query.length; i++) q.defer(function(token, done) {
            source._geocoder.getall(getter, 'degen', [token], done);
        }, query[i]);

        q.awaitAll(function(err, queryDegens) {
            if (err) return callback(err);
            source._geocoder.phrasematchDegens(queryDegens, function(err, ret) {
                if (err) return callback(err);
                queryidx = ret.queryidx;
                querymask = ret.querymask;
                querydist = ret.querydist;
                stats.degen[2] = stats.degen[2] && (+new Date() - stats.degen[2]);
                stats.degen[1] = ret.terms.length;
                return callback(null, ret.terms);
            });
        });
    }

    // @param {Array} queue a queue of results that is mutated by this call
    // @param {Function} callback called with `(err, result)`
    function getPhrases(queue, callback) {
        stats.phrase[0]++;
        stats.phrase[2] = +new Date();
        source._geocoder.getall(source.getGeocoderData.bind(source), 'term', queue, function(err, result) {
            if (err) return callback(err);
            stats.phrase[2] = stats.phrase[2] && (+new Date() - stats.phrase[2]);
            stats.phrase[1] = result.length;
            return callback(null, result);
        });
    }

    // @param {Array} queue a queue of results that is mutated by this call
    // @param {Function} callback called with `(err, result)`
    function getRelevantPhrases(queue, callback) {
        stats.term[0]++;
        stats.term[2] = +new Date();
        source._geocoder.getall(source.getGeocoderData.bind(source), 'phrase', queue, function(err, result) {
            if (err) return callback(err);
            source._geocoder.phrasematchPhraseRelev(queue, queryidx, querymask, querydist, function(err, ret) {
                if (err) return callback(err);
                relevs = ret.relevs;
                stats.term[2] = stats.term[2] && (+new Date() - stats.term[2]);
                stats.term[1] = ret.result.length;
                return callback(null, ret.result);
            });
        });
    }

    // @param {Array} queue a queue of results that is mutated by this call
    // @param {Function} callback called with `(err, result)`
    function getgrids(queue, callback) {
        stats.grid[0]++;
        stats.grid[2] = +new Date();

        source._geocoder.getall(source.getGeocoderData.bind(source), 'grid', queue, function(err) {
            if (err) return callback(err);

            var result = [],
                features = {},
                id, relev, grids,
                grid, feat;

            for (var a = 0; a < queue.length; a++) {
                id = queue[a];
                relev = relevs[id];
                grids = source._geocoder.get('grid', id);

                for (var i = 0; i < grids.length; i++) {
                    grid = grids[i];
                    feat = grid % idmod;
                    if (!features[feat] || docrelev[feat] < relev.tmprelev) {
                        features[feat] = new Relev(feat,
                            relev.relev,
                            relev.reason,
                            relev.count,
                            sourceidx,
                            dbid,
                            dbname,
                            sourceidx * 1e14 + feat);
                        docrelev[feat] = relev.tmprelev;
                    }
                }

                result.push.apply(result, grids);
            }

            stats.grid[2] = stats.grid[2] && (+new Date() - stats.grid[2]);
            stats.grid[1] = result.length;
            return callback(null, features, result);
        });
    }
};
