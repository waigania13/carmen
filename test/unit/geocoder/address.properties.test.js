'use strict';
const cluster = require('../../../lib/geocoder/addresscluster');
const test = require('tape');

test('default property', (t) => {
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

test('default property - duplicate address in cluster', (t) => {
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
