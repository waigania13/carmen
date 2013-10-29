var usagerelev = require('./usagerelev'),
    cleanFeature = require('./util/ops').feature;

var xd = Math.pow(2, 39),
    yd = Math.pow(2, 25),
    mp2_14 = Math.pow(2, 14),
    mp2_28 = Math.pow(2, 28);

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
            for (a = 0; zooms[a] < z; a++) {
                p = zooms[a];
                s = 1 << (z-p);
                pxy = (p * mp2_28) + (Math.floor(x/s) * mp2_14) + Math.floor(y/s);
                if (coalesced[pxy]) coalesced[zxy].push.apply(coalesced[zxy],coalesced[pxy]);
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

    var results = [],
        formatted = [],
        memo = null;

    for (j in rowMemo) {
        results.push(rowMemo[j]);
    }

    results.sort(sortByRelev);

    for (var k = 0; k < results.length; k++) {
        feat = results[k];
        if (memo === null || memo - feat.relev < 0.5) {
            memo = feat.relev;
            formatted.push(feat.db + '.' + feat.id);
        }
    }

    results = formatted;

    data.stats.relevTime = +new Date() - data.stats.relevTime;
    data.stats.relevCount = results.length;

    if (!results.length) return callback(null, results);

    // Disallow more than 50 of the best results at this point.
    if (results.length > 50) results = results.slice(0, 50);

    var start = +new Date(),
        contexts = [],
        remaining = results.length;

    // This function should be optimized away from `forEach`, but relies
    // on scope to deal with possibly async callbacks in `getFeature`
    results.forEach(loadResult);

    function loadResult(term) {
        var termid = parseInt(term.split('.')[1], 10),
            dbname = term.split('.')[0];

        carmen.indexes[dbname].getFeature(termid, featureLoaded);

        function featureLoaded(err, feat) {
            if (err) return (remaining = 0) && callback(err);
            carmen.contextByFeature(cleanFeature(termid, dbname, feat), contextLoaded);
        }
    }

    function contextLoaded(err, context) {
        if (err) return (remaining = 0) && callback(err);
        contexts.push(context);
        if (!--remaining) {
            data.stats.contextTime = +new Date() - start;
            data.stats.contextCount = contexts.length;
            return callback(null, contexts, relevd);
        }
    }

    // A threshold here reduces results early.
    // @TODO tune this.
    // if (relev < 0.75) return memo;
    function sortRelevReason(a, b) {
        var ai = types.indexOf(a.db);
        var bi = types.indexOf(b.db);
        if (ai < bi) return -1;
        else if (ai > bi) return 1;
        else if (a.relev > b.relev) return -1;
        else if (a.relev < b.relev) return 1;
        else if (a.reason > b.reason) return -1;
        else if (a.reason < b.reason) return 1;
        else if (a.id < b.id) return -1;
        else if (a.id > b.id) return 1;
        return 0;
    }
};

function sortByRelev(a, b) {
    return a.relev > b.relev ? -1 :
        a.relev < b.relev ? 1 :
        a.tmpid < b.tmpid ? -1 :
        a.tmpid > b.tmpid ? 1 : 0;
}
