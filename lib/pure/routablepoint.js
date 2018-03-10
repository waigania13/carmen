'use strict';
const nearestPointOnLine = require('@turf/nearest-point-on-line');

module.exports = routablePoint;

/**
 * Takes a point of origin and a feature, and returns the nearest point
 * on the associated LineString
 *
 * @param {!Object|!Array} point Point geojson geometry object or coordinate array
 * @param {!Object} feature Address feature with GeometryCollection of MultiPoint and LineStrings
 * @return {Array|null} Lon,lat coordinate array of the routable point
 */
function routablePoint(point, feature) {
    // TODO: using Object.keys here works for both arrays and objects since arrays are objects.
    // This may be confusing to read though since most of the time, we're expecting an object.
    // TODO: Should this accept both?
    if (!Object.keys(point).length || !feature || !feature.geometry.geometries) {
        return null;
    }

    // TODO: Check if feature is an address

    // Skip if routable_points is not already set, and the addressPoint isn't interpolated
    // TODO: Revisit what routable_points already being set will actually look like
    if (feature.routable_points || point.interpolated) {
        return null;
    }
    // TODO: Is there a case where there could be just feature.geometry (not geometries),
    // where we would want to apply this? e.g. just a street?
    // If so, change check above and add check for if feature.geometry.type is MultiLinestring

    const addressLineString = feature.geometry.geometries.find(
        (geom) => geom.type === 'MultiLineString' || !geom.type === 'LineString' // Not sure if LineString is ever possible
    );
    if (!addressLineString) {
        return null;
    }

    const nearestPoint = addressLineString ? nearestPointOnLine(addressLineString, point) : null;

    if (!nearestPoint) {
        return null;
    }
    // TODO: check for distance threshold

    // Round coordinates to 6 decimal places
    const nearestPointCoords = nearestPoint.geometry.coordinates.map(
        (coord) => Math.round(coord * Math.pow(10, 6)) / Math.pow(10, 6)
    );

    return nearestPointCoords;
}
