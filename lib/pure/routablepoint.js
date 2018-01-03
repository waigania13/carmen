const nearestPointOnLine = require("@turf/nearest-point-on-line");
const turfPoint = require("@turf/helpers").point;

module.exports = routablePoint;

/**
 * Takes a point of origin and a feature, and returns the nearest point
 * on the associated LineString
 *
 * @param {Array} point Lon,lat coordinate array
 * @param {Object} feature Address feature with GeometryCollection of MultiPoint and LineStrings
 * @return {Array} Lon,lat coordinate array of the routable point
 */
function routablePoint(point, feature) {
    // TODO: determine if this should throw error or if should just return empty array
    if (!point || !feature) {
        return [];
    }
    const addressLineString = feature.geometry.geometries.find(
        geom => geom.type === "MultiLineString"
    );
    if (!addressLineString) {
        return [];
    }
    const pt = turfPoint(point);

    const nearestPoint = addressLineString ? nearestPointOnLine(addressLineString, pt): [];

    // Round coordinates to 6 decimal places
    const nearestPointCoords = nearestPoint.geometry.coordinates.map(
        coord => Math.round(coord * Math.pow(10, 6)) / Math.pow(10, 6)
    );
    return nearestPointCoords;
}
