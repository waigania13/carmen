'use strict';
const nearestPointOnLine = require('@turf/nearest-point-on-line');

module.exports = routablePoint;

// TODO: get this from a config instead?
const ALLOWED_TYPES = new Set('address')

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
    // This is also redundant for now, since we're checking before we even call routablePoint
    if (feature.properties['carmen:routable_points']) {
        return null;
    }

    // If the point is interpolated, return the existing point coordinates
    if (point.interpolated) {
        return point.coordinates;
    }

    // Check if feature is an address
    if (!_isAllowedType(feature)) {
        return null
    }

    // Get geometries from feature.geometry.geometries, if it exists, as featureGeom
    // TODO: Is there a case where there could be just feature.geometry (not geometries)?
    const featureLineString = _findLineString(feature)

    const nearestPoint = featureLineString ? nearestPointOnLine(featureLineString, point) : null;

    if (!nearestPoint) {
        return null;
    }

    // Round coordinates to 6 decimal places
    const nearestPointCoords = nearestPoint.geometry.coordinates.map(
        (coord) => Math.round(coord * Math.pow(10, 6)) / Math.pow(10, 6)
    );

    return nearestPointCoords;
}


/**
 * Finds the LineString geometry in a GeoJSON feature, if it exists
 * @param {Object} feature GeoJSON feature
 * @return {Object} geometry GeoJSON geometry object
 */
function _findLineString(feature) {
    const { geometry } = feature

    if (!geometry) {
        return null;
    }

    if (geometry.geometries) {

        return geometry.geometries.find(
            (geom) => geom.type === 'MultiLineString' || geom.type === 'LineString'
        );
    }

   if (geometry.type === 'MultiLineString' || geometry.type === 'LineString') {
       return geometry
   }
}

/**
 * 
 * @param {Object} feature GeoJSON feature
 * @return {bool}
 */
function _isAllowedType(feature) {
    if (!feature.properties['carmen:types']) {
        return false;
    }
    if (feature.properties['carmen:types'].filter((type) => ALLOWED_TYPES.has(type))) {
        return true
    }
}