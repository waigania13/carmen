'use strict';
const tape = require('tape');
const routablePoint = require('../lib/pure/routablepoint.js');

(()=> {
    const testPrefix = 'routablePoint input validation: ';

    const pointObject = {
        type: 'Point',
        coordinates: [1.11, 1.11]
    };
    const feature = {
        id: 1,
        type: 'Feature',
        properties: {
            'carmen:addressnumber': [null, ['110', '112', '114']],
            'carmen:center': [1.111, 1.113],
            'carmen:types': ['address']
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

    const featureNoLinestring = {
        type: 'Feature',
        properties: {
            'carmen:types': ['address']
        },
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

    tape(testPrefix + 'point inputs', (assert) => {
        assert.deepEquals(
            routablePoint([], feature),
            null,
            'Empty point arrays should return null'
        );
        assert.deepEquals(
            routablePoint({}, feature),
            null,
            'Empty point objects should return null'
        );
        assert.ok(
            routablePoint(pointObject, feature),
            'Point objects should be accepted'
        );

        assert.ok(
            routablePoint([1, 1], feature),
            'Point arrays should be accepted'
        );
        assert.ok(
            routablePoint([0, 0], feature),
            '[0,0] should not necessarily return null'
        );
        assert.end();
    });

    tape(testPrefix + 'feature inputs', (assert) => {
        assert.deepEquals(
            routablePoint(pointObject),
            null,
            'Missing feature input should return null'
        );
        assert.deepEquals(
            routablePoint([1.11, 1.11], {}),
            null,
            'Empty feature input should return null'
        );
        assert.deepEquals(
            routablePoint(pointObject, featureNoLinestring),
            null,
            'Features with no linestrings should return null'
        );
        assert.end();
    });
})();

// Test interpolated points
(() => {
    const feature = {
        id: '7654',
        type: 'Feature',
        properties: {
            'carmen:text': 'Main Street',
            'carmen:center': [-97.2, 37.3],
            'carmen:score': 99,
            'carmen:rangetype': 'tiger',
            'carmen:lfromhn': [['100']],
            'carmen:ltohn': [['200']],
            'carmen:rfromhn': [['101']],
            'carmen:rtohn': [['199']],
            'carmen:parityl': [['E']],
            'carmen:parityr': [['O']],
            'carmen:zxy': ['6/14/24'],
            'id': '7654',
            'carmen:types': ['address'],
            'carmen:index': 'address',
            'carmen:address': '150'
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type: 'MultiLineString',
                coordinates: [
                    [
                        [-97.2, 37.2, 0],
                        [-97.2, 37.4, 0.19999999999999574]
                    ]
                ]
            }]
        }
    };

    const pointInterpolated = {
        type: 'Point',
        coordinates: [-97.2, 37.3],
        interpolated: true
    };
    tape('routablePoint input validation: interpolated point', (assert) => {
        assert.deepEquals(
            routablePoint(pointInterpolated, feature),
            null,
            'Interpolated point inputs should return null'
        );
        assert.end();
    });
})();

// Test feature that already has routable_points
// This is slightly redundant since it would also return null because this feature is a POI,
// but the realistic case is that routable_points will only be added for POIs
(() => {
    const featureRoutablePoints = {
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
            'carmen:index': 'poi',
            'carmen:routable_points': [[-122.213550, 37.712913]]
        },
        geometry: {
            type: 'Point',
            coordinates: [-122.22083, 37.72139]
        }
    };
    // TODO: Confirm these assumpitons - Both what routable_points looks like on the feature,
    // and the expected result of routablePoint if so.
    tape('routablePoint input validation: feature containing routable_points', (assert) => {
        assert.deepEquals(
            routablePoint([-122, 37], featureRoutablePoints),
            null,
            'features that already have routable_points should return null'
        );
        assert.end();
    });
})();

// Test routablePoint with POI
tape('routablePoint input validation: POI feature', (assert) => {
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
        },
        // This is slightly artificial since at this point in verifymatch, geometry actually gets stripped out
        geometry: {
            type: 'Point',
            coordinates: [-122.22083, 37.72139]
        }
    };

    assert.deepEquals(
        routablePoint(feature.properties['carmen:center'], feature),
        null,
        'non-addresses should not return routable Points'
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
            'carmen:center': [1.111, 1.113],
            'carmen:types': ['address']
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
            'carmen:center': [1.111, 1.113],
            'carmen:types': ['address']
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
            'carmen:center': [1.111, 1.113],
            'carmen:types': ['address']
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
