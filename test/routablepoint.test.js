'use strict';
const tape = require('tape');
const routablePoint = require('../lib/pure/routablepoint.js');


// Test validity of inputs
tape('routablePoint with feature without linestrings', (assert) => {
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

// TODO: Test routablePoint with feature with routable_points already defined
// TODO: Test routablePoint with non-address, that would otherwise work.
// This test passes, but it's because the POI features don't have geometries in the features (at least at tehe verifymatch stage),
// and they dont have geometryCollections at all.
// Maybe test with a locality or a street?


tape('routablePoint with POI', (assert) => {
    const feature = {
        id: 6666777777982370,
        type: 'Feature',
        properties: {
            'carmen:center': [-122.22083, 37.72139],
            'carmen:geocoder_stack': 'us',
            'carmen:score': 196,
            'landmark': true,
            'wikidata': 'Q1165584',
            'carmen:text_universal': 'OAK',
            'tel': '(510) 563-3300',
            'category': 'airport',
            'address': '1 Airport Dr',
            'carmen:text': 'Oakland International Airport,OAK,KOAK, Metropolitan Oakland International Airport, airport',
            'carmen:zxy': ['6/10/24'],
            'id': 6666777777982370,
            'carmen:types': ['poi'],
            'carmen:index': 'poi'
        }
    };

    assert.deepEquals(
        routablePoint(feature.properties['carmen:center'], feature),
        undefined,
        'non-addresses should not return routable Points'
    );
});

tape('routablePoint with empty point', (assert) => {
    const feature = {
        id: 1,
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
        }
    };
    const pointObject = {
        type: 'Point',
        coordinates: [1.11, 1.11]
    };

    assert.deepEquals(
        routablePoint([], feature),
        null,
        'Empty point arrays should return null'
    );

    assert.deepEquals(
        routablePoint(pointObject, feature),
        [1.111, 1.11],
        'Point object should work in addition to point coordinate array'
    );
    assert.end();
});

// straight line
(() => {
    const testPrefix = 'routablePoint on straight line: ';
    const feature = {
        id: 1,
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
        }
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
