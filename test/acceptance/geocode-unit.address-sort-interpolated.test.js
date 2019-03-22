'use strict';
const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const queue = require('d3-queue').queue;
const { queueFeature, buildQueued } = require('../../lib/indexer/addfeature');

// Test that non-interpolated results are returned before interpolated results
// with the same relevance. Note that features must have different
// `place_name`s to avoid being deduped in dedupe.js.
(() => {
    const conf = {
        address: new mem({ maxzoom: 6,  geocoder_address:1, geocoder_tokens: { 'Street': 'St' } }, () => {}),
    };
    const c = new Carmen(conf);
    tape('index address cluster to interpolate', (t) => {
        const address = {
            id: 1,
            properties: {
                'carmen:text': 'Main St',
                'carmen:center': [-97.2, 37.3],
                'carmen:rangetype': 'tiger',
                'carmen:lfromhn': [['100'], []],
                'carmen:ltohn': [['200'], []],
                'carmen:rfromhn': [['101'], []],
                'carmen:rtohn': [['199'], []],
                'carmen:parityl': [['E'], []],
                'carmen:parityr': [['O'], []],
                'carmen:addressnumber': [null, ['100', '200']]
            },
            geometry: {
                type: 'GeometryCollection',
                geometries: [
                    {
                        type: 'MultiLineString',
                        coordinates: [
                            [
                                [-97.2, 37.2],
                                [-97.2, 37.4]
                            ]
                        ]
                    },
                    {
                        type: 'MultiPoint',
                        coordinates: [[-97.2, 37.2],[-97.2, 37.4]]
                    }
                ]
            }
        };
        queueFeature(conf.address, address, t.end);
    });

    tape('index address cluster with real address feature', (t) => {
        const address = {
            id: 2,
            properties: {
                'carmen:text': 'Main Street',
                'carmen:center': [-97.2, 37.3],
                'carmen:rangetype': 'tiger',
                'carmen:lfromhn': [['100'], []],
                'carmen:ltohn': [['200'], []],
                'carmen:rfromhn': [['101'], []],
                'carmen:rtohn': [['199'], []],
                'carmen:parityl': [['E'], []],
                'carmen:parityr': [['O'], []],
                'carmen:addressnumber': [null, ['150']]
            },
            geometry: {
                type: 'GeometryCollection',
                geometries: [
                    {
                        type: 'MultiLineString',
                        coordinates: [
                            [
                                [-97.2, 37.2],
                                [-97.2, 37.4]
                            ]
                        ]
                    },
                    {
                        type: 'MultiPoint',
                        coordinates: [[-97.2, 37.3]]
                    }
                ]
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


    tape('Return non-interpolated address before interpolated address', (t) => {
        c.geocode('150 Main St', { limit_verify: 2, allow_dupes:true }, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.features.length, 2);
            t.deepEquals(res.features[0].id, 'address.2');
            t.deepEquals(res.features[0].geometry.interpolated, undefined);
            t.deepEquals(res.features[1].id, 'address.1');
            t.deepEquals(res.features[1].geometry.interpolated, true);
            t.end();
        });
    });

    tape('De-duplicate -interpolated address', (t) => {
        c.geocode('150 Main St', { limit_verify: 2 }, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.features.length, 1);
            t.deepEquals(res.features[0].id, 'address.2');
            t.deepEquals(res.features[0].geometry.interpolated, undefined);
            t.end();
        });
    });

    tape('teardown', (t) => {
        context.getTile.cache.reset();
        t.end();
    });
})();
