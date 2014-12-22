var getSetRelevance = require('./pure/setrelevance'),
    coalesceZooms = require('carmen-cache').Cache.coalesceZooms,
    spatialMatch = require('carmen-cache').Cache.spatialMatch,
    sm = new(require('sphericalmercator'))(),
    ops = require('./util/ops'),
    mp2_14 = Math.pow(2, 14),
    mp2_28 = Math.pow(2, 28),
    queue = require('queue-async'),
    termops = require('./util/termops'),
    feature = require('./util/feature');

var xd = Math.pow(2, 39),
    yd = Math.pow(2, 25),
    mp2_14 = Math.pow(2, 14),
    mp2_28 = Math.pow(2, 28);

module.exports = spatialmatch;

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
function spatialmatch(query, stats, geocoder, feats, grids, zooms, options, callback) {
    spatialMatch(query.length, feats, grids, zooms, spatialMatchAfter);

    function spatialMatchAfter(err, res) {
        if (err) return callback(err);
        return callback(null, res);
    }

//   //Stores the proximity latlng as zxy at all source zoom levels
//    var zxyProximity = {};

//    //If latlng is given, favour results closest locale
//    if (options.proximity) {
//        for (var i = 0; i < zooms.length; i++) {
//            zxyProximity[zooms[i]] = sm.px(options.proximity, zooms[i]);
//        }
//        var zxyResult = [];
//        for (var i = 0; i < results.length; i++) {
//            results[i].z = geocoder.indexes[results[i].dbid]._geocoder.zoom;
//            results[i].x = Math.floor(results[i].tmpid / xd);
//            results[i].y = Math.floor(results[i].tmpid % xd / yd);
//            results[i].distance = Math.pow(Math.pow(zxyProximity[results[i].z][0] - results[i].x, 2) + Math.pow(zxyProximity[results[i].z][1] - results[i].y, 2), 0.5);
//        }
//        results.sort(sortByProximity);
//    }
}

