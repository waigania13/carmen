var getSetRelevance = require('./pure/setrelevance'),
    coalesceZooms = require('./pure/coalescezooms'),
    queue = require('queue-async'),
    cleanFeature = require('./util/ops').feature;

module.exports = relevSort;

// Given that we've geocoded potential results in multiple sources, given
// arrays of `feats` and `grids` of the same length, combine matches that
// are over the same point, factoring in the zoom levels on which they
// occur.
// Calls `callback` with `(err, contexts, relevd)` in which
//
// @param `contexts` is an array of bboxes which are assigned scores
// @param `relevd` which is an object mapping place ids to places
// @param {Object} geocoder the geocoder instance
// @param {Array} feats an array of feature objects
// @param {Array} grids an array of grid objects
// @param {Array} zooms an array of zoom numbers
// @param {Function} callback
function relevSort(indexes, types, data, gecoder, feats, grids, zooms, callback) {

    // Combine the scores for each match across multiple grids and zoom levels,
    // producing a mapping from `zxy` to matches
    var coalesced = coalesceZooms(grids, feats, types, zooms, indexes);

    var sets = {},
        i, j, c, l,
        feat,
        rowMemo = {},
        rows,
        relev,
        fullid;

    for (c in coalesced) {
        rows = coalesced[c];
        // Sort by db, relev such that total relev can be
        // calculated without results for the same db being summed.
        rows.sort(sortRelevReason);
        relev = getSetRelevance(data.query, rows);

        // A threshold here reduces results early.
        // if (relev < 0.75) continue;

        for (i = 0, l = rows.length; i < l; i++) {
            fullid = rows[i].db + '.' + rows[i].id;
            sets[fullid] = sets[fullid] || rows[i];
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
            formatted.push(feat);
        }
    }

    results = formatted;

    data.stats.relevTime = +new Date() - data.stats.relevTime;
    data.stats.relevCount = results.length;

    if (!results.length) return callback(null, results);

    // Disallow more than 50 of the best results at this point.
    if (results.length > 50) results = results.slice(0, 50);

    var start = +new Date();
    var q = queue();

    results.forEach(function(term) {
        q.defer(loadResult, term);
    });

    q.awaitAll(function(err, contexts) {
        if (err) return callback(err);
        data.stats.contextTime = +new Date() - start;
        data.stats.contextCount = contexts.length;
        return callback(null, contexts, sets);
    });

    // For each result, load the feature from its Carmen index so that we can
    // then load all of the relevant contexts for that feature
    function loadResult(term, callback) {
        geocoder.indexes[term.db].getFeature(term.id, featureLoaded);
        function featureLoaded(err, feat) {
            if (err) return callback(err);
            geocoder._contextByFeature(cleanFeature(term.id, term.db, feat), contextLoaded);
        }
        function contextLoaded(err, context) {
            callback(err, context);
        }
    }

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
}

function sortByRelev(a, b) {
    return a.relev > b.relev ? -1 :
        a.relev < b.relev ? 1 :
        a.tmpid < b.tmpid ? -1 :
        a.tmpid > b.tmpid ? 1 : 0;
}
