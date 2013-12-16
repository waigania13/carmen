var sm = new (require('sphericalmercator'))(),
    ops = require('./util/ops'),
    context = require('./context'),
    termops = require('./util/termops'),
    getSetRelevance = require('./pure/setrelevance'),
    applyAddress = require('./pure/applyaddress'),
    _ = require('underscore'),
    sortByRelevance = require('./relevsort'),
    queue = require('queue-async'),
    DEBUG = process.env.DEBUG;

module.exports = function(geocoder, query, options, callback) {
    options = options || { stats:false };

    var indexes = geocoder.indexes;
    var types = Object.keys(indexes);
    var zooms = [];
    var stats = {};
    var queryData = {
        type: 'FeatureCollection',
        query: termops.tokenize(query, true),
        address: termops.address(query)
    };
    var q = queue();

    // lon,lat pair. Provide the context for this location.
    if (queryData.query.length === 2 && _(queryData.query).all(_.isNumber)) {
        return context(geocoder, queryData.query[0], queryData.query[1], null, true, function(err, context) {
            if (err) return callback(err);
            queryData.features = [];
            while (context.length) {
                queryData.features.push(ops.toFeature(context));
                context.shift();
            }
            if (options.stats) queryData.stats = stats;
            return callback(null, queryData);
        });
    }

    // keyword search. Find matching features.
    stats.searchTime = +new Date();

    // search runs `geocoder.search` over each backend with `data.query`,
    // condenses all of the results, and sorts them by potential usefulness.
    types.forEach(function(type) {
        q.defer(loadType, type);
    });

    q.awaitAll(function(err, res) {
        if (err) return callback(err);

        // unpack results
        var feats = [], grids = [];
        for (var i = 0; i < res.length; i++) {
            feats.push(res[i].feat);
            grids.push(res[i].grid);
        }

        zooms = zooms.sort(sortNumeric);
        stats.searchTime = +new Date() - stats.searchTime;
        stats.searchCount = _(grids).reduce(function(sum, v) {
            return sum + v.length;
        }, 0);
        stats.relevTime = +new Date();
        searchComplete(null, feats, grids, zooms);
    });

    function loadType(dbname, callback) {
        geocoder.search(indexes[dbname], queryData.query.join(' '), searchLoaded);
        function searchLoaded(err, feat, grid, s) {
            if (err) return callback(err);
            if (grid.length) {
                var z = indexes[dbname]._geocoder.zoom;
                if (zooms.indexOf(z) === -1) zooms.push(z);
            }
            callback(null, { feat: feat, grid: grid });
            if (DEBUG) stats['search.' + dbname] = s;
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
        sortByRelevance(indexes, types, queryData.query, stats, geocoder, feats, grids, zooms, function(err, contexts, sets) {
            if (err) return callback(err);

            var maxrelev = 0;

            var subsets;
            for (var j = 0, cl = contexts.length; j < cl; j++) {
                subsets = [];
                for (var i = 0, cjl = contexts[j].length; i < cjl; i++) {
                    var a = contexts[j][i];
                    if (sets[a._fhash]) subsets.push(sets[a._fhash]);
                }
                contexts[j]._relevance = getSetRelevance(queryData.query, subsets);
                contexts[j]._typeindex = types.indexOf(contexts[j][0]._extid.split('.')[0]);
            }

            contexts.sort(sortRelev);

            stats.relev = maxrelev;

            if (queryData.address !== undefined) {
                applyAddress(contexts[0], queryData.address);
            }

            queryData.features = contexts.map(ops.toFeature);

            if (options.stats) queryData.stats = stats;

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
                a = a[0];
                b = b[0];

                // secondary sort by score key.
                var as = a._score || 0;
                var bs = b._score || 0;
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
