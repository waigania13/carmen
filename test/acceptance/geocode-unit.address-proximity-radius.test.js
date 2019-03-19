'use strict';
// Tests whether routable_points is added to geocoding results

const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const queue = require('d3-queue').queue;
const { queueFeature, buildQueued } = require('../../lib/indexer/addfeature');

// Test non-interpolated address routable_points
(() => {
    const conf = {
        address: new mem({ maxzoom: 6, geocoder_coalesce_radius: 800, geocoder_address:1, geocoder_routable:1, geocoder_format: '{address._number} {address._name} {place._name}, {region._name} {postcode._name}, {country._name}' }, () => {}),
    };
    const c = new Carmen(conf);
    tape('index address', (t) => {
        const address = {
            id: 1,
            properties: {
                'carmen:text': 'fake street',
                'carmen:center': [0,0], // not used
                'carmen:addressnumber': [null, ['9','11','13']],
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
                                [1.115, 1.11]
                            ]
                        ]
                    },
                    {
                        type: 'MultiPoint',
                        coordinates: [[1.111, 1.111], [1.113, 1.111], [1.115, 1.111]]
                    }
                ]
            }
        };
        queueFeature(conf.address, address, t.end);
    });

    tape('index 2nd address', (t) => {
        const nearbyAddress = {
            id: 2,
            properties: {
                'carmen:text': 'fake ave',
                'carmen:center': [1.1139, 1.11], // not used
                'carmen:addressnumber': [null, ['9','11','13']],
                'carmen:types': ['address']
            },
            geometry: {
                type: 'GeometryCollection',
                geometries: [
                    {
                        type: 'MultiLineString',
                        coordinates: [
                            [
                                [1.1119, 1.11],
                                [1.1129, 1.11],
                                [1.1149, 1.11],
                                [1.1159, 1.11]
                            ]
                        ]
                    },
                    {
                        type: 'MultiPoint',
                        coordinates: [[1.1119, 1.111], [1.1130, 1.111], [1.1159, 1.111]]
                    }
                ]
            }
        };
        queueFeature(conf.address, nearbyAddress, t.end);
    });
    

    tape('build queued features', (t) => {
        const q = queue();
        Object.keys(conf).forEach((c) => {
            console.warn('\x1b[33m\x1b[7m\x1b[1m%s\x1b[0m', '\n   c:  ','\x1b[1m', c, '\x1b[0m');
            
            q.defer((cb) => {
                buildQueued(conf[c], cb);
            });
        });
        q.awaitAll(t.end);
    });

    tape('Forward search for address', (t) => {
        c.geocode('fake', { limit: 10}, (err, res) => {
            t.ifError(err);
            console.warn('\x1b[35m\x1b[7m\x1b[1m%s\x1b[0m', '\n   res:  ','\x1b[1m', res, '\x1b[0m');
            
            // t.deepEquals(res.features[1].id, 2, 'The second feature is returned');
            t.end();
        });
    });


    tape('teardown', (t) => {
        context.getTile.cache.reset();
        t.end();
    });
})();
