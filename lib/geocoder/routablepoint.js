'use strict';
const nearestPointOnLine = require('@turf/nearest-point-on-line');

module.exports = routablePoints;

// TODO: get this from a config instead?
const ALLOWED_TYPES = new Set();
ALLOWED_TYPES.add('address');

/**
 * Takes a point of origin and a feature, and returns the nearest point
 * on the associated LineString
 *
 * @param {!Object|!Array} point Point geojson geometry object or coordinate array
 * @param {!Object} feature Address feature with GeometryCollection of MultiPoint and LineStrings
 * @return {Array|null} Lon,lat coordinate array of the routable point
 */
function routablePoints(point, feature) {
    const routPoints = {
        found: false,
        supported_type: false,
        points: null
    };

    // TODO: Should this accept both arrays and objects?
    if (!point || !Object.keys(point).length || !feature || !Object.keys(feature).length) {
        return null;
    }

    // Skip if routable_points is not already set, and the addressPoint isn't interpolated
    // TODO: Revisit what routable_points already being set will actually look like.
    // For now this assumes it's in properties['carmen:routable_points'] to signify that it was added at index time
    // This is also redundant for now, since we're checking before we even call routablePoints
    if (feature.properties['carmen:routable_points']) {
        return {
            found: true,
            supported_type: true, // TODO is there ever a case where this wouldnt be true? We haven't checked for allowed types yet, but if there are existing routable_points, does that mean this feature's type is supported?
            points: feature.properties['carmen:routable_points']
        };
    }

    // If the point is interpolated, return the existing point coordinates
    if (point.interpolated) {
        return {
            found: true,
            supported_type: true,
            points: [{ coordinates: point.coordinates }]
        };
    }

    // Check if feature is an allowed type
    if (!_isAllowedType(feature)) {
        // Return initialized routPoint with all false/null values
        return routPoints;
    } else {
        routPoints.supported_type = true;
    }

    // Get LineString from feature geometry
    const featureLineString = _findLineString(feature);

    const nearestPoint = featureLineString ? nearestPointOnLine(featureLineString, point) : null;

    if (!nearestPoint) {
        return routPoints;
    } else {
        routPoints.found = true;
    }

    // Round coordinates to 6 decimal places
    const nearestPointCoords = nearestPoint.geometry.coordinates.map(
        (coord) => Math.round(coord * Math.pow(10, 6)) / Math.pow(10, 6)
    );

    routPoints.points = [{ coordinates: nearestPointCoords }];

    return routPoints;
}


/**
 * Finds the LineString geometry in a GeoJSON feature, if it exists
 *
 * @param {Object} feature GeoJSON feature
 * @return {Object} geometry GeoJSON geometry object
 */
function _findLineString(feature) {
    const { geometry } = feature;

    if (!geometry) {
        return null;
    }

    if (geometry.geometries) {
        const results = geometry.geometries.find(
            (geom) => geom.type === 'MultiLineString' || geom.type === 'LineString'
        );
        return results;
    }

    if (geometry.type === 'MultiLineString' || geometry.type === 'LineString') {
        return geometry;
    }
}

/**
 * Checks if at least one of the feature types is in the allowed types for routable points
 *
 * @param {Object} feature GeoJSON feature
 * @return {bool} whether the feature is of an allowed type
 */
function _isAllowedType(feature) {
    if (!feature.properties['carmen:types']) {
        return false;
    }
    if (feature.properties['carmen:types'].find((type) => ALLOWED_TYPES.has(type))) {
        return true;
    }
}
