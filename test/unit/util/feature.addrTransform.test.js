'use strict';
const tape = require('tape');
const transform = require('../../../lib/util/feature.js').addrTransform;

tape('Address Features', (t) => {
    t.deepEquals(transform({
        type: 'Feature',
        properties: {
            'carmen:text': 'Main Street Northwest',
            'carmen:addressnumber': [1, 2, 3]
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [[1,1], [2,2], [3,3]]
        }
    }), {
        type: 'Feature',
        properties: {
            'carmen:text': 'Main Street Northwest',
            'carmen:addressnumber': [[1, 2, 3]]
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type: 'MultiPoint',
                coordinates: [[1,1], [2,2], [3,3]]
            }]
        }
    }, 'address multipoint => geomcollection');

    t.deepEquals(transform({
        type: 'Feature',
        properties: {
            'carmen:text': 'Main Street Northwest',
            'carmen:addressnumber': [[1, 2, 3]]
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type: 'MultiPoint',
                coordinates: [[1,1], [2,2], [3,3]]
            }]
        }
    }), {
        type: 'Feature',
        properties: {
            'carmen:text': 'Main Street Northwest',
            'carmen:addressnumber': [[1, 2, 3]]
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type: 'MultiPoint',
                coordinates: [[1,1], [2,2], [3,3]]
            }]
        }
    }, 'address geomcollection => geomcollection');

    t.end();
});

tape('Network Features', (t) => {
    t.deepEquals(transform({
        type: 'Feature',
        properties: {
            'carmen:text': 'Main Street Northwest',
            'carmen:rangetype': 'tiger'
        },
        geometry: {
            type: 'MultiLineString',
            coordinates: [[[1,1], [2,2], [3,3]]]
        }
    }), {
        type: 'Feature',
        properties: {
            'carmen:text': 'Main Street Northwest',
            'carmen:rangetype': 'tiger',
            'carmen:parityl': [[]],
            'carmen:parityr': [[]],
            'carmen:lfromhn': [[]],
            'carmen:rfromhn': [[]],
            'carmen:ltohn': [[]],
            'carmen:rtohn': [[]]
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type: 'MultiLineString',
                coordinates: [[[1,1], [2,2], [3,3]]]
            }]
        }
    }, 'network multilinestring => geomcollection');

    t.deepEquals(transform({
        type: 'Feature',
        properties: {
            'carmen:text': 'Main Street Northwest',
            'carmen:rangetype': 'tiger',
            'carmen:parityl': [[]],
            'carmen:parityr': [[]],
            'carmen:lfromhn': [[]],
            'carmen:rfromhn': [[]],
            'carmen:ltohn': [[]],
            'carmen:rtohn': [[]]
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type: 'MultiLineString',
                coordinates: [[[1,1], [2,2], [3,3]]]
            }]
        }
    }), {
        type: 'Feature',
        properties: {
            'carmen:text': 'Main Street Northwest',
            'carmen:rangetype': 'tiger',
            'carmen:parityl': [[]],
            'carmen:parityr': [[]],
            'carmen:lfromhn': [[]],
            'carmen:rfromhn': [[]],
            'carmen:ltohn': [[]],
            'carmen:rtohn': [[]]
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type: 'MultiLineString',
                coordinates: [[[1,1], [2,2], [3,3]]]
            }]
        }
    }, 'network geomcollection => geomcollection');

    t.end();
});

tape('Intersection Features', (t) => {
    t.deepEquals(transform({
        type: 'Feature',
        properties: {
            'carmen:text': 'Main Street Northwest',
            'carmen:intersections': ['1st Avenue', '2nd Avenue', '3rd Avenue']
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [[1,1], [2,2], [3,3]]
        }
    }), {
        type: 'Feature',
        properties:
        {
            'carmen:text': 'Main Street Northwest',
            'carmen:intersections': [['1st Avenue', '2nd Avenue', '3rd Avenue']]
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type: 'MultiPoint',
                coordinates: [[1,1], [2,2], [3,3]]
            }]
        }
    }, 'intersection multipoint => geomcollection');

    t.deepEquals(transform({
        type: 'Feature',
        properties: {
            'carmen:text': 'Main Street Northwest',
            'carmen:intersections': [['1st Avenue', '2nd Avenue', '3rd Avenue']]
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type: 'MultiPoint',
                coordinates: [[1,1], [2,2], [3,3]]
            }]
        }
    }), {
        type: 'Feature',
        properties: {
            'carmen:text': 'Main Street Northwest',
            'carmen:intersections': [['1st Avenue', '2nd Avenue', '3rd Avenue']]
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type: 'MultiPoint',
                coordinates: [[1,1], [2,2], [3,3]]
            }]
        }
    }, 'intersection geomcollection => geomcollection');

    t.end();
});

tape('Combined Features', (t) => {
    t.deepEquals(transform({
        type: 'Feature',
        properties: {
            'carmen:text': 'Main Street Northwest',
            'carmen:addressnumber': [null, [1, 2, 3]],
            'carmen:rangetype': 'tiger',
            'carmen:parityl': [[], null],
            'carmen:parityr': [[], null],
            'carmen:lfromhn': [[], null],
            'carmen:rfromhn': [[], null],
            'carmen:ltohn': [[], null],
            'carmen:rtohn': [[], null]
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type: 'MultiLineString',
                coordinates: [[[1,1], [2,2], [3,3]]]
            },{
                type: 'MultiPoint',
                coordinates: [[1,1], [2,2], [3,3]]
            }]
        }
    }), {
        type: 'Feature',
        properties: {
            'carmen:text': 'Main Street Northwest',
            'carmen:addressnumber': [null, [1, 2, 3]],
            'carmen:rangetype': 'tiger',
            'carmen:parityl': [[], []],
            'carmen:parityr': [[], []],
            'carmen:lfromhn': [[], []],
            'carmen:rfromhn': [[], []],
            'carmen:ltohn': [[], []],
            'carmen:rtohn': [[], []]
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type: 'MultiLineString',
                coordinates: [[[1,1], [2,2], [3,3]]]
            },{
                type: 'MultiPoint',
                coordinates: [[1,1], [2,2], [3,3]]
            }]
        }
    }, 'address + network => geomcollection');

    t.deepEquals(transform({
        type: 'Feature',
        properties: {
            'carmen:text': 'Main Street Northwest',
            'carmen:addressnumber': [[1, 2, 3], null],
            'carmen:rangetype': 'tiger',
            'carmen:parityl': [null, []],
            'carmen:parityr': [null, []],
            'carmen:lfromhn': [null, []],
            'carmen:rfromhn': [null, []],
            'carmen:ltohn': [null, []],
            'carmen:rtohn': [null, []]
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type: 'MultiPoint',
                coordinates: [[1,1], [2,2], [3,3]]
            },{
                type: 'MultiLineString',
                coordinates: [[[1,1], [2,2], [3,3]]]
            }]
        }
    }), {
        type: 'Feature',
        properties: {
            'carmen:text': 'Main Street Northwest',
            'carmen:addressnumber': [[1, 2, 3], null],
            'carmen:rangetype': 'tiger',
            'carmen:parityl': [[], []],
            'carmen:parityr': [[], []],
            'carmen:lfromhn': [[], []],
            'carmen:rfromhn': [[], []],
            'carmen:ltohn': [[], []],
            'carmen:rtohn': [[], []]
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type: 'MultiPoint',
                coordinates: [[1,1], [2,2], [3,3]]
            },{
                type: 'MultiLineString',
                coordinates: [[[1,1], [2,2], [3,3]]]
            }]
        }
    }, 'network + address => geomcollection');

    t.deepEquals(transform({
        type: 'Feature',
        properties: {
            'carmen:text': 'Main Street Northwest',
            'carmen:addressnumber': [[1, 2, 3], null, null],
            'carmen:intersections': [null, ['1st Avenue', '2nd Avenue', '3rd Avenue'], null],
            'carmen:rangetype': 'tiger',
            'carmen:parityl': [null, null, []],
            'carmen:parityr': [null, null, []],
            'carmen:lfromhn': [null, null, []],
            'carmen:rfromhn': [null, null, []],
            'carmen:ltohn': [null, null, []],
            'carmen:rtohn': [null, null, []]
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type: 'MultiPoint',
                coordinates: [[1,1], [2,2], [3,3]]
            },{
                type: 'MultiPoint',
                coordinates: [[1,1], [2,2], [3,3]]
            },{
                type: 'MultiLineString',
                coordinates: [[[1,1], [2,2], [3,3]]]
            }]
        }
    }), {
        type: 'Feature',
        properties: {
            'carmen:text': 'Main Street Northwest',
            'carmen:addressnumber': [[1, 2, 3], null, null],
            'carmen:intersections': [null,['1st Avenue', '2nd Avenue', '3rd Avenue'], null],
            'carmen:rangetype': 'tiger',
            'carmen:parityl': [[], [], []],
            'carmen:parityr': [[], [], []],
            'carmen:lfromhn': [[], [], []],
            'carmen:rfromhn': [[], [], []],
            'carmen:ltohn': [[], [], []],
            'carmen:rtohn': [[], [], []]
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type: 'MultiPoint',
                coordinates: [[1,1], [2,2], [3,3]]
            },{
                type: 'MultiPoint',
                coordinates: [[1,1], [2,2], [3,3]]
            },{
                type: 'MultiLineString',
                coordinates: [[[1,1], [2,2], [3,3]]]
            }]
        }
    }, 'intersection + address + network => geomcollection');

    t.end();
});
