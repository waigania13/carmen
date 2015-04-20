var Point = require('turf-point');
var distance = require('turf-distance');
var ops = require('./ops');
var SphericalMercator = require('sphericalmercator');
var Relev = require('./relev');

var sm = new SphericalMercator();

function toCenter(bbox) {
    return sm.forward([bbox[0] - bbox[3], bbox[1] - bbox[3]]);
}


function coarse(matched, grids, zooms, options) {
    //Setup grid lookup - each layer is an object in the array with id->grid
    var gridlookup = [];
    for (var layer_it = 0; layer_it < grids.length; layer_it++) {
        gridlookup[layer_it] = {};
        for (var grid_it = 0; grid_it < grids[layer_it].length; grid_it++) {
            tmpGrid = ops.grid(grids[layer_it][grid_it]);
            gridlookup[layer_it][tmpGrid.id] = tmpGrid;
        }
    }
    //The centre of each tile is calculated in merc and then sorted
    var proxSM = sm.forward(options.proximity);
    matched.results.sort(function(a, b) {
        a = new Relev(a);
        b = new Relev(b);
        if (a.relev !== b.relev) return 0; //Only sort with same relev

        var centerA = toCenter(sm.bbox(gridlookup[a.idx][a.id].x, gridlookup[a.idx][a.id].y, zooms[a.idx]));
        var centerB = toCenter(sm.bbox(gridlookup[b.idx][b.id].x, gridlookup[b.idx][b.id].y, zooms[b.idx]));
        a = Math.sqrt(Math.pow(centerA[0] - proxSM[0],2) + Math.pow(centerA[1] - proxSM[1],2));
        b = Math.sqrt(Math.pow(centerB[0] - proxSM[0],2) + Math.pow(centerB[1] - proxSM[1],2));

        if (a < b) return -1; //a is closer
        else if (a > b) return 1; //b is closer
        else return 0; //same
    });

    return matched;
}

function fine(queryData, options) {
    queryData.features.sort(function(a, b) {
        //Only sort features with same relev/idx level
        if (a.relevance !== b.relevance) return 0;
        if (a.id.split('.')[0] !== b.id.split('.')[0]) return 0;

        var res = [a, b].map(function(ele) {
            return distance(Point(options.proximity), Point(ele.center), 'miles');
        });
        if (res[0] < res[1]) return -1; //a is closer
        else if (res[1] < res[0]) return 1; //b is closer
        else return 0; //same
    });

    return queryData;
}

module.exports = {
    coarse: coarse,
    fine: fine
};
