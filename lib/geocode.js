var sm = new (require('sphericalmercator'))(),
    termops = require('./util/termops'),
    getSetRelevance = require('./pure/setrelevance'),
    _ = require('underscore'),
    sortByRelevance = require('./relevsort'),
    DEBUG = process.env.DEBUG;

module.exports = function(carmen, query, callback) {
    var indexes = carmen.indexes;
    var types = Object.keys(indexes);
    var zooms = [];
    var queryData = {
        query: termops.tokenize(query, true),
        stats: {}
    };

    // lon,lat pair. Provide the context for this location.
    if (queryData.query.length === 2 && _(queryData.query).all(_.isNumber)) {
        return carmen.context(queryData.query[0], queryData.query[1], null, function(err, context) {
            if (err) return callback(err);
            queryData.results = context.length ? [context] : [];
            return callback(null, queryData);
        });
    }

    // keyword search. Find matching features.
    queryData.stats.searchTime = +new Date();

    // search runs `carmen.search` over each backend with `data.query`,
    // condenses all of the results, and sorts them by potential usefulness.
    var feats = [],
        grids = [],
        remaining = types.length;

    types.forEach(loadType);

    function loadType(dbname, pos) {
        carmen.search(indexes[dbname], queryData.query.join(' '), searchLoaded);

        function searchLoaded(err, feat, grid, stats) {
            if (err) {
                remaining = 0;
                return searchComplete(err);
            }
            if (grid.length) {
                var z = indexes[dbname]._geocoder.zoom;
                if (zooms.indexOf(z) === -1) zooms.push(z);
            }
            feats[pos] = feat;
            grids[pos] = grid;
            if (DEBUG) queryData.stats['search.' + dbname] = stats;
            if (!--remaining) {
                zooms = zooms.sort(sortNumeric);
                queryData.stats.searchTime = +new Date() - queryData.stats.searchTime;
                queryData.stats.searchCount = _(grids).reduce(function(sum, v) {
                    return sum + v.length;
                }, 0);
                queryData.stats.relevTime = +new Date();
                searchComplete(null, feats, grids, zooms);
            }
        }
    }

    // ## searchComplete
    //
    // Calls the callback to `geocode` when complete. Called once per
    // call to `geocode`.
    //
    // @param {Object} err an error potentially given by the caller
    // @param {Array} feats a list of feature objects
    // @param {Array} grids a list of grid objects
    // @param {Array} zooms a list of zoom numbers
    function searchComplete(err, feats, grids, zooms) {
        if (err) return callback(err);
        sortByRelevance(indexes, types, queryData, carmen, feats, grids, zooms, function(err, contexts, sets) {
            if (err) return callback(err);

            var maxrelev = 0;

            var subsets;
            for (var j = 0, cl = contexts.length; j < cl; j++) {
                subsets = [];
                for (var i = 0, cjl = contexts[j].length; i < cjl; i++) {
                    var a = contexts[j];
                    if (sets[a[i].id]) {
                        subsets.push(sets[a[i].id]);
                        a[i].relev = sets[a[i].id].relev;
                    }
                }
                contexts[j]._relevance = getSetRelevance(queryData.query, subsets);
                contexts[j]._typeindex = types.indexOf(contexts[j][0].id.split('.')[0]);
            }

            contexts.sort(sortRelev);

            queryData.results = contexts;
            queryData.stats.relev = maxrelev;
            return callback(null, queryData);

            function sortRelev(a, b) {
                // First, compute the relevance of this query term against
                // each set.
                if (a._relevance > b._relevance) return -1;
                if (a._relevance < b._relevance) return 1;

                // primary sort by result's index.
                if (a._typeindex < b._typeindex) return -1;
                if (a._typeindex > b._typeindex) return 1;

                // within results of equal relevance.
                a = a[0], b = b[0];

                // secondary sort by score key.
                var as = a.score || 0;
                var bs = b.score || 0;
                if (as > bs) return -1;
                if (as < bs) return 1;

                // last sort by id.
                if (a.id > b.id) return -1;
                if (a.id < b.id) return 1;
                return 0;
            }
        });
    }
};

function sortNumeric(a,b) { return a < b ? -1 : 1; }
