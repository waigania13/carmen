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
    return sm.forward([bbox[0] - bbox[2], bbox[1] - bbox[3]]);
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
    var layer_it = grids.length;
    while (layer_it--) {
        gridlookup[layer_it] = {};
        var grid_it = grids[layer_it].length;
        while (grid_it--) {
            var tmpGrid = ops.grid(grids[layer_it][grid_it]);
            gridlookup[layer_it][tmpGrid.id] = tmpGrid;
        }
    }
    //The centre of each tile is calculated in merc and then sorted
    var proxSM = sm.forward(options.proximity);
    results.sort(function(a, b) {
        a = new Relev(a);
        b = new Relev(b);
        if (a.relev !== b.relev) return 0; //Only sort with same relev

        var centerA = toCenter(sm.bbox(gridlookup[a.idx][a.id].x, gridlookup[a.idx][a.id].y, zooms[a.idx]));
        var centerB = toCenter(sm.bbox(gridlookup[b.idx][b.id].x, gridlookup[b.idx][b.id].y, zooms[b.idx]));
        a = Math.sqrt(Math.pow(centerA[0] - proxSM[0],2) + Math.pow(centerA[1] - proxSM[1],2));
        b = Math.sqrt(Math.pow(centerB[0] - proxSM[0],2) + Math.pow(centerB[1] - proxSM[1],2));

        return a - b;
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
    results.features.sort(function(a, b) {
        //Only sort features with same relev/idx level
        if (a.relevance !== b.relevance) return 0;
        if (a.id.split('.')[0] !== b.id.split('.')[0]) return 0;

        a = distance(Point(options.proximity), Point(a.center), 'miles');
        b = distance(Point(options.proximity), Point(b.center), 'miles');
        
        return a - b;
    });

    return results;
}

module.exports = {
    toCenter: toCenter,
    coarse: coarse,
    fine: fine
};
