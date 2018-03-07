'use strict';
const tape = require('tape');
const routablePoint = require('../lib/pure/routablepoint.js');

tape('features without linestrings', (assert) => {
    const point = [1.111, 1.11];
    const featureNoLinestring = {
        type: 'Feature',
        properties: {},
        geometry: {
            type: 'GeometryCollection',
            geometries: [
                {
                    type: 'MultiPoint',
                    coordinates: [[1, 1]]
                }
            ]
        }
    };

    assert.deepEquals(
        routablePoint(point, featureNoLinestring),
        null,
        'Features with no linestrings should return null'
    );
    assert.end();
});

// straight line
(() => {
    const testPrefix = 'routablePoint on straight line: ';
    const feature = {
        type: 'Feature',
        properties: {
            'carmen:addressnumber': [null, ['110', '112', '114']],
            'carmen:center': [1.111, 1.113]
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [
                {
                    type: 'MultiLineString',
                    coordinates: [
                        [
                            [1.111, 1.11],
                            [1.112, 1.11],
                            [1.114, 1.11],
                            [1.118, 1.11],
                        ]
                    ]
                },
                {
                    type: 'MultiPoint',
                    coordinates: [[1.111, 1.111], [1.113, 1.111], [1.118, 1.111]]
                }
            ]
        },
        id: 1
    };

    tape(testPrefix + 'with actual feature point', (assert) => {

        /**
         * Example point (x) feature point coords (.) and linestring coords (-) looks like:
         *
         * .   x   .
         * - - - - -
         */
        assert.deepEquals(
            routablePoint([1.113, 1.111], feature),
            [1.113, 1.11],
            'Point that is same as input'
        );
        assert.end();
    });

    tape(testPrefix + 'with point already on linestring', (assert) => {
        /**
         * Example point (x) feature point coords (.) and linestring coords (-) looks like:
         *
         * .   .   .
         * - - x - -
         */
        assert.deepEquals(
            routablePoint([1.111, 1.11], feature),
            [1.111, 1.11],
            'Point that is already on linestring should return itself'
        );
        assert.end();
    });

    tape(testPrefix + 'with point ???', (assert) => {

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
            'Point in between linestring coords should return midpoint between coords on linestring'
        );
        assert.end();
    });

    tape(testPrefix + 'with point not in the linestring', (assert) => {

        /**
         * Example point (x) feature point coords (.) and linestring coords (-) looks like:
         *
         *         x
         * .   .       .
         * - - - - - - -
         */
        assert.deepEquals(
            routablePoint([1.115, 1.115], feature),
            [1.115, 1.11],
            'Point not in the linestring'
        );
        assert.end();
    });
})();

// zigzag line
(() => {
    const testPrefix = 'routablePoint on ZigZag Line: ';
    const feature = {
        type: 'Feature',
        properties: {
            'carmen:addressnumber': [null, ['110', '112', '114']],
            'carmen:center': [1.111, 1.113]
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [
                {
                    type: 'MultiLineString',
                    coordinates: [
                        [
                            [1.111, 1.11],
                            [1.112, 1.112],
                            [1.114, 1.11],
                            [1.118, 1.112]
                        ]
                    ]
                },
                {
                    type: 'MultiPoint',
                    coordinates: [[1.111, 1.111], [1.113, 1.112], [1.115, 1.111]]
                }
            ]
        },
        id: 1
    };

    tape(testPrefix + 'on a diagonal', (assert) => {

        /**
         * Example point (x) feature point coords (.) and linestring coords (-) looks like:
         *
         *          x
         *  .        .
         * /  \ /  \
         *     .
         */

        assert.deepEquals(
            routablePoint([1.116, 1.113], feature),
            [1.1168, 1.1114],
            'point projected onto the diagonal'
        );
        assert.end();
    });
})();

// |_| cul de sac street
(() => {
    const testPrefix = 'routablePoint in cul de sac: ';
    const feature = {
        type: 'Feature',
        properties: {
            'carmen:addressnumber': [null, ['110', '112', '114']],
            'carmen:center': [1.111, 1.113]
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [
                {
                    type: 'MultiLineString',
                    coordinates: [
                        [
                            [1.111, 1.112],
                            [1.111, 1.111],
                            [1.112, 1.111],
                            [1.112, 1.112]
                        ]
                    ]
                },
                {
                    type: 'MultiPoint',
                    coordinates: [[1.111, 1.112], [1.1115, 1.111], [1.1115, 1.112]]
                }
            ]
        },
        id: 1
    };

    tape(testPrefix + 'right in the middle of a cul de sac', (assert) => {

        /**
         * Example point (x) feature point coords (.) and linestring coords (-) looks like:
         *
         *  |         |
         *   <-- x
         *  | _ _ _ _ |
         */

        // in a case like this where either side of the cul de sac is equal distance from the point
        // expecting the projection to be on the side closest to the beginning of the line
        assert.deepEquals(
            routablePoint([1.1115, 1.1115], feature),
            [1.111, 1.1115],
            'Point projected to left side of the cul de sac line'
        );
        assert.end();
    });

    tape(testPrefix + 'off-center in the middle of a cul de sac', (assert) => {

        /**
         * Example point (x) feature point coords (.) and linestring coords (-) looks like:
         *
         *  |         |
         *        x -->
         *  | _ _ _ _ |
         */

        assert.deepEquals(
            routablePoint([1.1118, 1.1115], feature),
            [1.112, 1.1115],
            'point projected to the closer side of the cul de sac line'
        );
        assert.end();
    });

    tape(testPrefix + 'off-center in the middle of a cul de sac', (assert) => {

        /**
         * Example point (x) feature point coords (.) and linestring coords (-) looks like:
         *
         *  |         |
         *  |         |
         *  |      x  |
         *   _ _ _ _ _
         */

        assert.deepEquals(
            routablePoint([1.1118, 1.1112], feature),
            [1.112, 1.1112],
            'point projected to the side of the cul de sac line it is closest to'
        );
        assert.end();
    });
})();

/**
 * TODO: Test invalidinputs
 * TODO: Test non-straight linestring
 * TODO: Test linestring and point with 2 equidistant closest points (and determine expected behavior)
 * TODO: Test case where point is entirely offset from linestring, e.g.:
 *       x
 *              -------------------
 * TODO: Test not interpolated feature?
 * TODO: Integration tests for reverse geocoding?
 * TODO: Test cases crossing dateline?
 */


