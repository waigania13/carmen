var tape = require('tape');
var routablePoint = require('../lib/pure/routablepoint.js');

tape('call routablePoint with valid inputs', function(assert) {
    var point = [1.111, 1.11];
    var feature = {
        type: "Feature",
        properties: {
            "carmen:addressnumber": [null, ["110", "112", "114"]],
            "carmen:text": "Main street",
            "carmen:geocoder_stack": "us",
            "carmen:center": [1.111, 1.113]
        },
        geometry: {
            type: "GeometryCollection",
            geometries: [
                {
                    type: "MultiLineString",
                    coordinates: [
                        [
                            [1.111, 1.11],
                            [1.112, 1.11],
                            [1.114, 1.11],
                            [1.115, 1.11]
                        ]
                    ]
                },
                {
                    type: "MultiPoint",
                    coordinates: [[1.111, 1.111], [1.113, 1.111], [1.115, 1.111]]
                }
            ]
        },
        id: 1
    };

    var featureNoLinestring = {
        type: "Feature",
        properties: {},
        geometry: {
            type: "GeometryCollection",
            geometries: [
                {
                    type: "MultiPoint",
                    coordinates: [[1, 1]]
                }
            ]
        }
    };

    var result = routablePoint(point, feature);

    assert.deepEquals(
        routablePoint(point, featureNoLinestring),
        [],
        "Features with no linestrings should return empty array"
    );

    /**
     * Example point (x) feature point coords (.) and linestring coords (-) looks like:
     *
     * .   .   .
     * - - x - -
     */
    assert.deepEquals(
        result,
        point,
        "Point that is already on linestring should return itself"
    );

    /**
     * Example point (x) feature point coords (.) and linestring coords (-) looks like:
     *
     *     x
     * .   .   .
     * - -   - -
     */
    assert.deepEquals(
        routablePoint([1.113, 1.115], feature),
        [1.113, 1.11],
        "Point in between linestring coords should return midpoint between coords on linestring"
    );

    assert.end();
});

/**
 * TODO: Test non-straight linestring
 * TODO: Test linestring and point with 2 equidistant closest points (and determine expected behavior)
 * TODO: Test case where point is entirely offset from linestring, e.g.:
 *       x
 *              -------------------
 * TODO: Test invalid inputs
 * TODO: Test not interpolated feature?
 * TODO: Integration tests for reverse geocoding?
 * TODO: Test cases crossing dateline
 */


// TODO: Test invalidinputs
// tape('call routablePoint with invalid inputs', function(assert) {
//     var point = {};
//     var malformedPoint = "1, 1";
//     var feature = {
//         type: "Feature",
//         properties: {
//             "carmen:addressnumber": [null, ["110", "112", "114"]],
//             "carmen:text": "Main street",
//             "carmen:geocoder_stack": "us",
//             "carmen:center": [1.11, 1.13]
//         },
//         geometry: {
//             type: "GeometryCollection",
//             geometries: [
//                 {
//                     type: "MultiLineString",
//                     coordinates: [
//                         [
//                             [1.11, 1.111],
//                             [1.11, 1.112],
//                             [1.11, 1.113],
//                             [1.11, 1.114],
//                             [1.11, 1.115]
//                         ]
//                     ]
//                 },
//                 {
//                     type: "MultiPoint",
//                     coordinates: [
//                         [1.111, 1.111],
//                         [1.111, 1.113],
//                         [1.111, 1.115]
//                     ]
//                 }
//             ]
//         },
//         id: 1
//     };

//     assert.throws(
//         routablePoint(),
//         Error,
//         "Missing point and feature params throws error"
//     );
//     assert.throws(routablePoint(point), Error, "Missing feature throws error");
//     assert.throws(
//         routablePoint(malformedPoint, feature),
//         Error,
//         "Malformed point throws error"
//     );

//     assert.end();
// });
