var Inside = require('turf-inside');
var BBox = require('turf-bbox-polygon');
var Point = require('turf-point');

module.exports.inside = inside;

function inside(coordinates, bbox) {
    var point = Point(coordinates);
    if (!bbox) return true;
    var poly = BBox(bbox);
    return Inside(point, poly);
}