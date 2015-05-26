var Point = require('turf-point');
var Distance = require('turf-distance');
var ops = require('./ops');
var SphericalMercator = require('sphericalmercator');
var Relev = require('./relev');

var sm = new SphericalMercator();


/**
 * toCenter - takes lat/lng bbox and returns centre in mercator
 *
 * @param  {Array} bbox in format [w, s, e, n]
 * @return {Array} [x,y] of mercator center
 */
function toCenter(bbox) {
    return sm.forward([(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2]);
}

function distance(proximity, center) {
    if (!proximity) return 0;
    return Distance(Point(proximity), Point(center), 'miles');
}

/**
 * coarse - sorts results based on coarse tile grid values
 *
 * @param  {Array} results grid results to sort
 * @param  {Array} grids   Array of Arrays of grid esults for each layer
 * @param  {Array} zooms   Array of zooms for each layer
 * @param  {Object} options geocoder options
 * @return {Array}         sorted grid results
 */
function coarse(results, grids, zooms, groups, options) {
    //Setup grid lookup - each layer is an object in the array with id->grid
    var gridlookup = [];
    var proxSM = sm.forward(options.proximity); //proximity in merc
    var layer_it = grids.length;
    while (layer_it--) { //Allow grid lookup by gridlookup[idx][id]
        gridlookup[layer_it] = {};
        var grid_it = grids[layer_it].length;
        while (grid_it--) {
            var tmpGrid = ops.grid(grids[layer_it][grid_it]);
            var currentCenter = toCenter(sm.bbox(tmpGrid.x, tmpGrid.y, zooms[layer_it]));
            // a^2 + b^2 as dist
            var dist = (currentCenter[0] - proxSM[0])*(currentCenter[0] - proxSM[0]) +
                (currentCenter[1] - proxSM[1])*(currentCenter[1] - proxSM[1]);
            if (gridlookup[layer_it][tmpGrid.id] !== undefined) {
                gridlookup[layer_it][tmpGrid.id] = Math.min(dist, gridlookup[layer_it][tmpGrid.id]);
            } else {
                gridlookup[layer_it][tmpGrid.id] = dist;
            }
        }
    }

    var relevlookup = {};
    var relev_it = results.length;
    while (relev_it--) { //precalculate center & dist to proc for sorting
        var relev = new Relev(results[relev_it]);
        relevlookup[results[relev_it]] = {
            relev: relev,
            group: groups[relev.idx],
            dist: gridlookup[relev.idx][relev.id]
        };
    }
    results.sort(function(a, b) {
        a = relevlookup[a];
        b = relevlookup[b];
        return (b.relev.relev - a.relev.relev) ||
            (a.group - b.group) ||
            (a.dist - b.dist);
    });

    return results;
}

module.exports = {
    distance: distance,
    toCenter: toCenter,
    coarse: coarse
};
