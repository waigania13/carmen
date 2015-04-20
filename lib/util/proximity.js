var Point = require('turf-point');
var distance = require('turf-distance');
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


/**
 * coarse - sorts results based on coarse tile grid values
 *
 * @param  {Array} results grid results to sort
 * @param  {Array} grids   Array of Arrays of grid esults for each layer
 * @param  {Array} zooms   Array of zooms for each layer
 * @param  {Object} options geocoder options
 * @return {Array}         sorted grid results
 */
function coarse(results, grids, zooms, options) {
    //Setup grid lookup - each layer is an object in the array with id->grid
    var gridlookup = [];
    var proxSM = sm.forward(options.proximity); //proximity in merc
    var layer_it = grids.length;
    while (layer_it--) { //Allow grid lookup by gridlookup[idx][id]
        gridlookup[layer_it] = {};
        var grid_it = grids[layer_it].length;
        while (grid_it--) {
            var tmpGrid = ops.grid(grids[layer_it][grid_it]);
            gridlookup[layer_it][tmpGrid.id] = tmpGrid;
        }
    }

    relevlookup = {};
    var relev_it = results.length;
    while (relev_it--) { //precalculate center & dist to proc for sorting
        relevlookup[results[relev_it]] = { relev: new Relev(results[relev_it]) };
        var currentRelev = relevlookup[results[relev_it]].relev;
        var currentCenter = toCenter(
            sm.bbox(
                gridlookup[currentRelev.idx][currentRelev.id].x,
                gridlookup[currentRelev.idx][currentRelev.id].y,
                zooms[currentRelev.idx]
            )
        );

        // a^2 + b^2 as dist
        relevlookup[results[relev_it]].dist = (currentCenter[0] - proxSM[0])*(currentCenter[0] - proxSM[0]) + (currentCenter[1] - proxSM[1])*(currentCenter[1] - proxSM[1]);
    }
    results.sort(function(a, b) {
        a = relevlookup[a];
        b = relevlookup[b];
        if (a.relev.relev !== b.relev.relev) return 0; //Only sort with same relev
        return a.dist - b.dist;
    });

    return results;
}


/**
 * fine - sorts results based on fine lat/lng coords
 *
 * @param  {Geojson} results result set to sort
 * @param  {Objet} options geocoder options
 * @return {Geojson}         return sorted result
 */
function fine(results, options) {
    var proxPt = Point(options.proximity);
    var resultlookup = {};
    var result_it = results.features.length;
    while (result_it--) {
        resultlookup[results.features[result_it].id] = {
            id: results.features[result_it].id.split('.')[0],
            pt: Point(results.features[result_it].center)
        };
        resultlookup[results.features[result_it].id].dist = distance(proxPt, resultlookup[results.features[result_it].id].pt, 'miles');
    }

    results.features.sort(function(a, b) {
        //Only sort features with same relev/idx level
        if (a.relevance !== b.relevance) return 0;
        a = resultlookup[a.id];
        b = resultlookup[b.id];
        if (a.id !== b.id) return 0;
        return a.dist - b.dist;
    });

    return results;
}

module.exports = {
    toCenter: toCenter,
    coarse: coarse,
    fine: fine
};
