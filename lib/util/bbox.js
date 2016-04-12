var Inside = require('turf-inside');
var Poly = require('turf-bbox-polygon');
var Point = require('turf-point');
var SphericalMercator = require('sphericalmercator');
var Intersect = require('turf-intersect');

var merc = new SphericalMercator({
    size: 256
});

module.exports.inside = inside;
module.exports.insideTile = insideTile;
module.exports.intersect = intersect;
/**
* inside - Return whether a coordinate is inside a bounding box.
* @param {Array} coordinates A lon/lat array
* @param {Array} bbox A bounding box array in the format [minX, minY, maxX, maxY]
* @return {boolean} Is the point inside the bbox
*/
function inside(coordinates, bbox) {
    var point = Point(coordinates);
    if (!bbox) return true;
    var poly = BBox(bbox);
    return Inside(point, poly);
}

/**
* insideTile - Return bounding box in xyz coordinate format
* @param {Array} bbox A bounding box array in the format [minX, minY, maxX, maxY]
* @param {number} zoom The zoom level of the xyz bounds
* @return {Array} An xyz bounding box array in the format [zoom, xyz.minX, xyz.minY, xyz.maxX, xyz.maxY]
*/

function insideTile(bbox, zoom) {
    var xyz = merc.xyz(bbox, zoom);
    var obj = [zoom, xyz.minX, xyz.minY, xyz.maxX, xyz.maxY];
    return obj;
}

/**
* intersect - Return whether two bounding boxes intersect
* @param {Array} bbox1 A bounding box array in the format [minX, minY, maxX, maxY]
* @param {Array} bbox2 A bounding box array in the format [minX, minY, maxX, maxY]
* @return {boolean} Do the two bounding boxes intersect
*/

function intersect(bbox1, bbox2) {
    var poly1 = Poly(bbox1);
    var poly2 = Poly(bbox2);
    var intersects = Intersect(poly1, poly2);
    return !!intersects;
}