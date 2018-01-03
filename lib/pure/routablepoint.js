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
    // TODO: Handle unexpected inputs
    // if (!point) {
    //     throw new Error('routablePoint requires a point');
    // } else if (!feature) {
    //     throw new Error('routablePoint requires a feature');
    // }

    return [];
}
