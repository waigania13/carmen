var sm = new (require('sphericalmercator'))(),
    termops = require('./util/termops'),
    usagerelev = require('./usagerelev'),
    _ = require('underscore'),
    relev = require('./relevsort'),
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
    search(types, queryData, searchComplete);

    function search(types, data, callback) {
        var feats = [],
            grids = [],
            remaining = types.length;

        types.forEach(function(dbname, pos) {
            carmen.search(indexes[dbname], data.query.join(' '), null, searchLoaded);

            function searchLoaded(err, feat, grid, stats) {
                if (err) {
                    remaining = 0;
                    return callback(err);
                }
                if (grid.length) {
                    var z = indexes[dbname]._carmen.zoom;
                    if (zooms.indexOf(z) === -1) zooms.push(z);
                }
                feats[pos] = feat;
                grids[pos] = grid;
                if (DEBUG) data.stats['search.' + dbname] = stats;
                if (!--remaining) {
                    zooms = zooms.sort(sortNumeric);
                    data.stats.searchTime = +new Date() - data.stats.searchTime;
                    data.stats.searchCount = _(grids).reduce(function(sum, v) {
                        return sum + v.length;
                    }, 0);
                    data.stats.relevTime = +new Date();
                    callback(null, feats, grids, zooms);
                }
            }
        });
    }

    function searchComplete(err, feats, grids, zooms) {
        if (err) return callback(err);
        relev(indexes, types, queryData, carmen, feats, grids, zooms, function(err, contexts, relevd) {
            if (err) return callback(err);

            var maxrelev = 0;
            contexts.sort(sortRelev);
            queryData.results = contexts;
            queryData.stats.relev = maxrelev;
            return callback(null, queryData);

            function sortRelev(a, b) {
                // sort by usagerelev score.
                var ac = [];
                var bc = [];
                for (var i = 0; i < a.length; i++) if (relevd[a[i].id]) {
                    ac.push(relevd[a[i].id]);
                    a[i].relev = relevd[a[i].id].relev;
                }
                for (i = 0; i < b.length; i++) if (relevd[b[i].id]) {
                    bc.push(relevd[b[i].id]);
                    b[i].relev = relevd[b[i].id].relev;
                }
                var arelev = usagerelev(queryData.query, ac);
                var brelev = usagerelev(queryData.query, bc);
                if (arelev > brelev) return -1;
                if (arelev < brelev) return 1;

                // within results of equal relevance.
                a = a[0], b = b[0];

                // primary sort by result's index.
                var adb = a.id.split('.')[0];
                var bdb = b.id.split('.')[0];
                var ai = types.indexOf(adb);
                var bi = types.indexOf(bdb);
                if (ai < bi) return -1;
                if (ai > bi) return 1;

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
