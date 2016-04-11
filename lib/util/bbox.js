var Inside = require('turf-inside');
var BBox = require('turf-bbox-polygon');
var Point = require('turf-point');
var SphericalMercator = require('sphericalmercator');
var Intersect = require('turf-intersect');

var merc = new SphericalMercator({
    size: 256
});

module.exports.inside = inside;
module.exports.insideTile = insideTile;
module.exports.intersect = intersect;

function inside(coordinates, bbox) {
    var point = Point(coordinates);
    if (!bbox) return true;
    var poly = BBox(bbox);
    return Inside(point, poly);
}

function insideTile(bbox, zoom) {
    var xyz = merc.xyz(bbox, zoom);
    var obj = [zoom, xyz.minX, xyz.minY, xyz.maxX, xyz.maxY];
    return obj;
}

function intersect(poly1, poly2) {
    var box1 = BBox(poly1);
    var box2 = BBox(poly2);
    var intersects = Intersect(box1, box2);
    return !!intersects;
}