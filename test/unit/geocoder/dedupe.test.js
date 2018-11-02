'use strict';
const dedupe = require('../../../lib/geocoder/dedupe');
const tape = require('tape');

tape('dedup lowercase vs caps', (t) => {
    const features = [
        {
            place_name: '20 main st',
            text: 'main st',
            address: 20,
            center:[0,0],
            geometry: {
                type:'Point',
                coordinates:[0,0]
            }
        },
        {
            place_name: '20 MAIN ST',
            text: 'MAIN ST',
            address: 20,
            center:[0,0],
            geometry: {
                type:'Point',
                coordinates:[0,0]
            }
        }
    ];
    t.deepEqual(dedupe(features), [
        features[0]
    ], 'dedupes by lowercase vs caps');

    t.end();
});

tape('dedupe', (t) => {
    let features = [
        {
            place_name: 'main st springfield',
            text: 'main st',
            center:[0,0],
            geometry: {
                type:'Point',
                coordinates:[0,0]
            }
        },
        {
            place_name: 'wall st springfield',
            text: 'wall st',
            center:[10,0],
            geometry: {
                type:'Point',
                coordinates:[10,0]
            }
        },
        {
            place_name: 'main st springfield',
            text: 'main st',
            center:[20,0],
            geometry: {
                type:'Point',
                coordinates:[20,0]
            }
        },
    ];
    t.deepEqual(dedupe(features), [
        features[0],
        features[1]
    ], 'dedupes by place_name');

    features = [
        {
            place_name: '100 main st springfield 00001',
            address:100,
            text: 'main st',
            center:[0,0],
            geometry: {
                type:'Point',
                coordinates:[0,0]
            }
        },
        {
            place_name: '100 main st springfield 00002',
            address:100,
            text: 'main st',
            center:[20,0],
            geometry: {
                type:'Point',
                coordinates:[20,0]
            }
        },
    ];
    t.deepEqual(dedupe(features), [
        features[0],
        features[1],
    ], 'dupe identical addresses when dist >= 5km');

    features = [
        {
            place_name: '100 main st springfield 00001',
            address:100,
            text: 'main st',
            center:[0.000,0],
            geometry: {
                type:'Point',
                coordinates:[0.000,0]
            }
        },
        {
            place_name: '100 main st springfield 00002',
            address:100,
            text: 'main st',
            center:[0.001,0],
            geometry: {
                type:'Point',
                coordinates:[0.001,0]
            }
        },
    ];
    t.deepEqual(dedupe(features), [
        features[0]
    ], 'dedupes identical addresses when dist < 5km');

    features = [
        {
            place_name: '100 main st springfield 00001',
            address:100,
            text: 'main st',
            center:[0.000,0],
            geometry: {
                type:'Point',
                coordinates:[0.000,0]
            }
        },
        {
            place_name: '100 main st springfield 00002',
            address:100,
            text: 'main st',
            center:[0.001,0],
            geometry: {
                type:'Point',
                coordinates:[0.001,0]
            }
        },
        {
            place_name: '100 main st springfield 00001',
            address:100,
            text: 'main st',
            center:[1,0],
            geometry: {
                type:'Point',
                coordinates:[1,0]
            }
        }
    ];
    t.deepEqual(dedupe(features), [
        features[0]
    ], 'dedupes identical addresses + placenames when dist < 5km');

    features = [
        {
            place_name: '100 main st springfield 00001',
            address:100,
            text: 'main st',
            center:[0.000,0],
            geometry: {
                omitted: true,
                interpolated: true,
                type:'Point',
                coordinates:[0.000,0]
            }
        },
        {
            place_name: '100 main st springfield 00002',
            address:100,
            text: 'main st',
            center:[0.001,0],
            geometry: {
                interpolated: true,
                type:'Point',
                coordinates:[0.001,0]
            }
        },
    ];
    t.deepEqual(dedupe(features), [
        features[1]
    ], 'dedupes identical addresses, prioritizes non-omitted');

    // Reverse to make sure logic works in reverse order.
    features.reverse();
    t.deepEqual(dedupe(features), [
        features[0]
    ], 'dedupes identical addresses, prioritizes non-omitted');

    t.end();
});

