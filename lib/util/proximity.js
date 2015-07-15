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
    }
    return _scoredist(scorefactor, distance(proximity, center));
}

// _scoredist() calculates a value from the distance which is appropriate for
// comparison with _score values in an index.
//
// Some definitions:
// - scorefactor: approximation of 1/8th of the max score for a given index
// - dist: a distance, in miles, between the center, or approximate center,
//   of a feature and the user's location (proximity).
//
// - when a feature is 40 miles from the user, it has 1/8th the max score
// - when a feature is 5 miles from the user, it has 1x the max score
// - when a feature is 1 mile from the user, it has 5x the max score
// - when a feature is 0.1 miles from the user, it has 50x the max score
//
// Basically: once a feature is within a 5-10 mile radius of a user it starts
// to become more relevant than other highly scored features in the index.
module.exports._scoredist = _scoredist;
function _scoredist(scorefactor, dist) {
    return Math.round(scorefactor * (40/(Math.max(dist,0.0001))) * 10000) / 10000;
}

