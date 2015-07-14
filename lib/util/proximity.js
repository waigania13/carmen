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

module.exports.pxy2zxy = pxy2zxy;
function pxy2zxy(pxy, z) {
    // Interval between parent and target zoom level
    var zDist = z - pxy[0];
    if (zDist === 0) return pxy;
    if (zDist < 0) throw new Error('Cannot translate pxy to lower zxy');
    var zMult = zDist - 1;
    // Midpoint length @ z for a tile at parent zoom level
    var pMid = Math.pow(2,zDist) / 2;
    return [ z, (pxy[1] * zMult) + pMid, (pxy[2] * zMult) + pMid ];
}

