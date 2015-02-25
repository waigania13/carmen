var coalesceZooms = require('carmen-cache').Cache.coalesceZooms,
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
}
