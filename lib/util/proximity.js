var Point = require('turf-point');
var Distance = require('turf-distance');
var ops = require('./ops');
var SphericalMercator = require('sphericalmercator');
var Relev = require('./relev');
var sm = new SphericalMercator();

module.exports = {};

module.exports.distance = distance;
function distance(proximity, center) {
    if (!proximity) return 0;
    return Distance(Point(proximity), Point(center), 'miles');
}

module.exports.center2zxy = center2zxy;
function center2zxy(lon, lat, z) {
    var bbox = sm.xyz([lon,lat,lon,lat], z);
    return [ z, bbox.minX, bbox.minY ];
}

module.exports.scoredist = scoredist;
function scoredist(proximity, center, scorefactor) {
    // if center is a z/x/y coordinate triplet, convert to lon/lat
    if (center.length === 3) {
        var bbox = sm.bbox(center[1], center[2], center[0]);
        center = [
            bbox[0] + (bbox[2]-bbox[0])*0.5,
            bbox[1] + (bbox[3]-bbox[1])*0.5
        ];
        console.log(bbox);
    }
    return _scoredist(scorefactor, distance(proximity, center));
}

module.exports._scoredist = _scoredist;
function _scoredist(scorefactor, dist) {
    return Math.round(scorefactor * (80/(Math.max(dist,0.0001))) * 10000) / 10000;
}
