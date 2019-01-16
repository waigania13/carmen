'use strict';
const cluster = require('../../../lib/geocoder/addresscluster');
const test = require('tape');

test('forward: default property', (t) => {
    t.deepEqual(cluster.forward({
        type: 'Feature',
        properties: {
            accuracy: 'building',
            'carmen:addressnumber': [[100, 200, 300]]
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type: 'MultiPoint',
                coordinates: [[1,1],[2,2],[3,3]]
            }]
        }
    }, 100), [{
        type: 'Point',
        coordinates: [1,1],
        properties: {
            accuracy: 'building'
        }
    }], 'address property');

    t.end();
});

test('forward: default property - duplicate address in cluster', (t) => {
    t.deepEqual(cluster.forward({
        type: 'Feature',
        properties: {
            accuracy: 'building',
            'carmen:addressnumber': [[100, 200, 300, 100]]
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type: 'MultiPoint',
                coordinates: [[1,1],[2,2],[3,3], [10, 10]]
            }]
        }
    }, 100), [{
        type: 'Point',
        coordinates: [1,1],
        properties: {
            accuracy: 'building'
        }
    },{
        type: 'Point',
        coordinates: [10,10],
        properties: {
            accuracy: 'building'
        }
    }], 'address property');

    t.end();
});

test('forward: override property', (t) => {
    t.deepEqual(cluster.forward({
        type: 'Feature',
        properties: {
            accuracy: 'building',
            'carmen:addressnumber': [[100, 200, 300]],
            'carmen:addressprops': {
                accuracy: {
                    1: 'point',
                    2: 'entrance'
                }
            }
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type: 'MultiPoint',
                coordinates: [[1,1],[2,2],[3,3]]
            }]
        }
    }, 300), [{
        type: 'Point',
        coordinates: [3,3],
        properties: {
            accuracy: 'entrance'
        }
    }], 'address property');

    t.end();
});

test('forward: override property - duplicate address in cluster', (t) => {
    t.deepEqual(cluster.forward({
        type: 'Feature',
        properties: {
            accuracy: 'building',
            'carmen:addressnumber': [[100, 200, 300, 300]],
            'carmen:addressprops': {
                accuracy: {
                    1: 'point',
                    2: 'entrance',
                    3: 'driveway'
                }
            }
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type: 'MultiPoint',
                coordinates: [[1,1],[2,2],[3,3],[4,4]]
            }]
        }
    }, 300), [{
        type: 'Point',
        coordinates: [3,3],
        properties: {
            accuracy: 'entrance'
        }
    },{
        type: 'Point',
        coordinates: [4,4],
        properties: {
            accuracy: 'driveway'
        }
    }], 'address property');

    t.end();
});
