'use strict';
// Ensures that relev takes into house number into consideration
// Also ensure relev is applied to US & Non-US Style addresses

const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../../lib/indexer/addfeature');
const queueFeature = addFeature.queueFeature;
const buildQueued = addFeature.buildQueued;

(() => {
    const conf = {
        place: new mem({ maxzoom: 6, geocoder_format: '{{place.name}}' }, () => {}),
        address: new mem({ maxzoom: 6, geocoder_address: 1, geocoder_format: '{{address.number}} {{address.name}} {{place.name}}' }, () => {})
    };
    const c = new Carmen(conf);
    tape('index place', (t) => {
        const place = {
            id: 1,
            properties: {
                'carmen:text': 'Springfield',
                'carmen:center': [0,0]
            },
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [-0.0116729736328125, -0.011243820118254096],
                    [0.013475418090820312, -0.011243820118254096],
                    [0.013475418090820312, 0.008625984159309985],
                    [-0.0116729736328125, 0.008625984159309985],
                    [-0.0116729736328125, -0.011243820118254096]
                ]]
            }
        };
        queueFeature(conf.place, place, t.end);
    });

    tape('index place', (t) => {
        const place = {
            id: 2,
            properties: {
                'carmen:text': 'Seneca Rocks',
                'carmen:center': [6.663208007812499, 34.96699890670367]
            },
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [6.2841796875, 34.813803317113155],
                    [7.0751953125, 34.813803317113155],
                    [7.0751953125, 35.137879119634185],
                    [6.2841796875, 35.137879119634185],
                    [6.2841796875, 34.813803317113155]
                ]]
            }
        };
        queueFeature(conf.place, place, t.end);
    });

    tape('index address', (t) => {
        const address = {
            id: 1,
            properties: {
                'carmen:text': 'fake street',
                'carmen:center': [0,0],
                'carmen:addressnumber': ['123','234','456']
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,0],[0,0],[0,0]]
            }
        };
        queueFeature(conf.address, address, t.end);
    });
    tape('index address', (t) => {
        const address = {
            id: 2,
            properties: {
                'carmen:text': 'fake street',
                'carmen:center': [6.663208007812499, 34.96699890670367],
                'carmen:addressnumber': ['123','234','456']
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[6.663208007812499, 34.96699890670367],[6.663208007812499, 34.96699890670367],[6.663208007812499, 34.96699890670367]]
            }
        };
        queueFeature(conf.address, address, t.end);
    });

    tape('build queued features', (t) => {
        const q = queue();
        Object.keys(conf).forEach((c) => {
            q.defer((cb) => {
                buildQueued(conf[c], cb);
            });
        });
        q.awaitAll(t.end);
    });

    tape('Search for working address - Springfield', (t) => {
        c.geocode('123 fake street, Springfield', null, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '123 fake street Springfield');
            t.end();
        });
    });

    tape('Search for working address - Seneca Rocks', (t) => {
        c.geocode('123 fake street, Seneca Rocks', null, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '123 fake street Seneca Rocks');
            t.end();
        });
    });

    tape('Search for non-existant address - Springfield', (t) => {
        c.geocode('124 fake street, Springfield', null, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'fake street Springfield');
            t.end();
        });
    });

    tape('Search for non-existant address - Springfield', (t) => {
        c.geocode('123444 fake street, Springfield', null, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'fake street Springfield');
            t.end();
        });
    });

    tape('Search for non-existant address - Seneca Rocks', (t) => {
        c.geocode('123444 fake street, Seneca Rocks', null, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'fake street Seneca Rocks');
            t.end();
        });
    });

    tape('teardown', (t) => {
        context.getTile.cache.reset();
        t.end();
    });
})();
