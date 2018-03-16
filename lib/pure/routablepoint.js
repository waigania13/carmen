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

    // TODO: Should this accept both arrays and objects?
    if (!Object.keys(point).length || !feature || !Object.keys(feature).length) {
        return null;
    }

    // Skip if routable_points is not already set, and the addressPoint isn't interpolated
    // TODO: Revisit what routable_points already being set will actually look like.
    // For now this assumes it's in properties['carmen:routable_points'] to signify that it was added at index time
    if (feature.properties['carmen:routable_points'] || point.interpolated) {
        return null;
    }

    // Check if feature is an address
    if (!feature.properties['carmen:types'] || !feature.properties['carmen:types'].includes('address')) {
        return null;
    }

    // Get geometries from feature.geometry.geometries, if it exists, as featureGeom
    // TODO: Is there a case where there could be just feature.geometry (not geometries)?
    const { geometry: { geometries: featureGeom } = {} } = feature;

    if (!featureGeom) {
        return null;
    }

    const addressLineString = featureGeom.find(
        (geom) => geom.type === 'MultiLineString' || !geom.type === 'LineString' // Not sure if LineString is ever possible
    );

    const nearestPoint = addressLineString ? nearestPointOnLine(addressLineString, point) : null;

    if (!nearestPoint) {
        return null;
    }

    // Round coordinates to 6 decimal places
    const nearestPointCoords = nearestPoint.geometry.coordinates.map(
        (coord) => Math.round(coord * Math.pow(10, 6)) / Math.pow(10, 6)
    );

    return nearestPointCoords;
}
