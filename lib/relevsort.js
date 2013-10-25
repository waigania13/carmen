var usagerelev = require('./usagerelev');

// Given that we've geocoded potential results in multiple sources, given
// arrays of `feats` and `grids` of the same length, combine matches that
// are over the same point, factoring in the zoom levels on which they
// occur.
// Calls `callback` with `(err, contexts, relevd)` in which
//
// `contexts` is an array of bboxes which are assigned scores
// `relevd` which is an object mapping place ids to places
module.exports = function(indexes, types, data, carmen, feats, grids, zooms, callback) {

    var relevd = {};
    var coalesced = {};
    var i, j, c;

    // Coalesce relevs into higher zooms, e.g.
    // z5 inherits relev of overlapping tiles at z4.
    // @TODO assumes sources are in zoom ascending order.
    var xd = Math.pow(2, 39),
        yd = Math.pow(2, 25),
        mp2_14 = Math.pow(2, 14),
        mp2_28 = Math.pow(2, 28);

    var h, grid, feat, x, y, p, s, pxy, a, zxy, f, z;
    for (h = 0; h < grids.length; h++) {
        grid = grids[h];
        feat = feats[h];
        z = indexes[types[h]]._carmen.zoom;
        for (i = 0; i < grid.length; i++) {
            f = feat[grid[i] % yd];
            if (!f) continue;
            x = Math.floor(grid[i]/xd);
            y = Math.floor(grid[i]%xd/yd);
            zxy = (z * mp2_28) + (x * mp2_14) + y;
            // @TODO this is an optimization that  assumes multiple
            // DBs do not use the same zoom level.
            if (!coalesced[zxy]) coalesced[zxy] = [f];
            a = 0;
            while (zooms[a] < z) {
                p = zooms[a];
                s = 1 << (z-p);
                pxy = (p * mp2_28) + (Math.floor(x/s) * mp2_14) + Math.floor(y/s);
                if (coalesced[pxy]) coalesced[zxy].push.apply(coalesced[zxy],coalesced[pxy]);
                a++;
            }
        }
    }

    var rowMemo = {}, rows, relev, fullid;
    for (c in coalesced) {
        rows = coalesced[c];
        // Sort by db, relev such that total relev can be
        // calculated without results for the same db being summed.
        rows.sort(sortRelevReason);
        relev = usagerelev(data.query, rows);
        for (i = 0, l = rows.length; i < l; i++) {
            fullid = rows[i].db + '.' + rows[i].id;
            relevd[fullid] = relevd[fullid] || rows[i];
            rowMemo[rows[i].tmpid] = rowMemo[rows[i].tmpid] || {
                db: rows[i].db,
                id: rows[i].id,
                tmpid: rows[i].tmpid,
                relev: relev
            };
        }
    }

    // A threshold here reduces results early.
    // @TODO tune this.
    // if (relev < 0.75) return memo;
    function sortRelevReason(a, b) {
        var ai = types.indexOf(a.db);
        var bi = types.indexOf(b.db);
        if (ai < bi) return -1;
        if (ai > bi) return 1;
        if (a.relev > b.relev) return -1;
        if (a.relev < b.relev) return 1;
        if (a.reason > b.reason) return -1;
        if (a.reason < b.reason) return 1;
        if (a.id < b.id) return -1;
        if (a.id > b.id) return 1;
        return 0;
    }

    var results = [];
    for (j in rowMemo) {
        results.push(rowMemo[j]);
    }

    results.sort(sortByRelev);

    var formatted = [];
    results = results.reduce(function(memo, feature) {
        if (!memo.length || memo[0].relev - feature.relev < 0.5) {
            memo.push(feature);
            formatted.push(feature.db + '.' + feature.id);
        }
        return memo;
    }, []);
    results = formatted;

    data.stats.relevTime = +new Date() - data.stats.relevTime;
    data.stats.relevCount = results.length;

    if (!results.length) return callback(null, results);

    // Disallow more than 50 of the best results at this point.
    if (results.length > 50) results = results.slice(0,50);

    var start = +new Date();
    var contexts = [];
    var remaining = results.length;
    // This function should be optimized away from `forEach`, but relies
    // on scope to deal with possibly async callbacks in `getFeature`
    results.forEach(function(term) {
        var termid = parseInt(term.split('.')[1], 10);
        var dbname = term.split('.')[0];
        carmen.indexes[dbname].getFeature(termid, function(err, feat) {
            if (err) return (remaining = 0) && callback(err);
            carmen.contextByFeature(feature(termid, dbname, feat), function(err, context) {
                if (err) return (remaining = 0) && callback(err);
                contexts.push(context);
                if (!--remaining) {
                    data.stats.contextTime = +new Date() - start;
                    data.stats.contextCount = contexts.length;
                    return callback(null, contexts, relevd);
                }
            });
        });
    });
};

function sortByRelev(a, b) {
    return a.relev > b.relev ? -1 :
        a.relev < b.relev ? 1 :
        a.tmpid < b.tmpid ? -1 :
        a.tmpid > b.tmpid ? 1 : 0;
}

// Clean up internal fields/prep a feature entry for external consumption.
function feature(id, type, data) {
    data.id = type + '.' + id;
    data.type = data.type || type;
    if ('string' === typeof data.bounds)
        data.bounds = data.bounds.split(',').map(parseFloat);
    if ('search' in data)
        delete data.search;
    if ('rank' in data)
        delete data.rank;
    return data;
}
