'use strict';
const dedupe = require('../../../lib/geocoder/dedupe');
const tape = require('tape');

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
            place_name: 'main st springfield 00001',
            text: 'main st',
            center:[0.000,0],
            geometry: {
                omitted: true,
                type:'Point',
                coordinates:[0.000,0]
            }
        },
        {
            place_name: 'main st springfield 00001',
            text: 'main st',
            center:[0.001,0],
            geometry: {
                type:'Point',
                coordinates:[0.001,0]
            }
        },
    ];
    t.deepEqual(dedupe(features), [
        features[1]
    ], 'dedupes, prioritizes non-omitted');

    // Reverse to make sure logic works in reverse order.
    features.reverse();
    t.deepEqual(dedupe(features), [
        features[0]
    ], 'dedupes, prioritizes non-omitted');

    t.end();
});

