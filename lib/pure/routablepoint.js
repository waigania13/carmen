'use strict';
const nearestPointOnLine = require('@turf/nearest-point-on-line');
const turfPoint = require('@turf/helpers').point;

module.exports = routablePoint;

/**
 * Takes a point of origin and a feature, and returns the nearest point
 * on the associated LineString
 *
 * @param {Array} point Lon,lat coordinate array
 * @param {Object} feature Address feature with GeometryCollection of MultiPoint and LineStrings
 * @return {Array|null} Lon,lat coordinate array of the routable point
 */
function routablePoint(point, feature) {
    // TODO: determine if this should throw error or if should just return null
    if (!point || !feature) {
        return null;
    }

    const addressLineString = feature.geometry.geometries.find(
        (geom) => geom.type === 'MultiLineString'
    );
    if (!addressLineString) {
        return null;
        // TODO: could be a point, not interpolated. Should this return the point itself?
    }

    const pt = turfPoint(point);

    const nearestPoint = addressLineString ? nearestPointOnLine(addressLineString, pt) : null;

    if (!nearestPoint) {
        return null;
    }

    // Round coordinates to 6 decimal places
    const nearestPointCoords = nearestPoint.geometry.coordinates.map(
        (coord) => Math.round(coord * Math.pow(10, 6)) / Math.pow(10, 6)
    );

    // For now, return nearestPointCoords as an item in an array.
    // TODO: eventually, figure out how we want to identify multiple routable points.
    return [nearestPointCoords];
}
