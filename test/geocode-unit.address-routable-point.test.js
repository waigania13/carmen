// Tests whether routable_points is added to geocoding results
'use strict';
const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

// Test non-interpolated address routable_points
(() => {
    const conf = {
        address: new mem({ maxzoom: 6,  geocoder_address:1, geocoder_format: '{address._number} {address._name} {place._name}, {region._name} {postcode._name}, {country._name}' }, () => {}),
    };
    const c = new Carmen(conf);
    tape('index address', (t) => {
        const address = {
            id:1,
            properties: {
                'carmen:text': 'fake street',
                'carmen:center': [0,0], // not used
                'carmen:addressnumber': [null, ['9','11','13']]
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
        queueFeature(conf.address, address, () => { buildQueued(conf.address, t.end); });
    });

    tape('Forward search for non-interpolated address and return routable points', (t) => {
        c.geocode('9 fake street', { limit_verify: 1, debug: true, full: true }, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.features[0].routable_points,
                [[1.111, 1.11]],
                'Forward geocode of non-interpolated address result has correct routable_point');
            t.end();
        });
    });
})();


// Test interpolated address
(() => {
    const conf = {
        address: new mem({ maxzoom: 6,  geocoder_address:1, geocoder_format: '{address._number} {address._name} {place._name}, {region._name} {postcode._name}, {country._name}' }, () => {}),
    };
    const c = new Carmen(conf);
    tape('index address', (t) => {

        const address = {
            id: '7654',
            type: 'Feature',
            properties: {
                'carmen:text': 'Main Street',
                'carmen:center': [-97.2, 37.3],
                'carmen:score': 99,
                'carmen:rangetype': 'tiger',
                'carmen:lfromhn': ['100'],
                'carmen:ltohn': ['200'],
                'carmen:rfromhn': ['101'],
                'carmen:rtohn': ['199'],
                'carmen:parityl': ['E'],
                'carmen:parityr': ['O'],
            },
            geometry: {
                type: 'MultiLineString',
                coordinates: [
                    [
                        [-97.2, 37.2],
                        [-97.2, 37.4]
                    ]
                ]
            }
        };

        queueFeature(conf.address, address, () => { buildQueued(conf.address, t.end); });
    });

    tape('Forward search for interpolated address', (t) => {
        c.geocode('150 Main Street', { debug: true, full: true }, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.features[0].routable_points,
                undefined,
                'Forward geocode of interpolated address result should not set routable_points');
            t.end();
        });
    });
})();


// Test feature that doesn't have linestring data
(() => {
    const conf = {
        address: new mem({ maxzoom: 6,  geocoder_address:1, geocoder_format: '{address._number} {address._name} {place._name}, {region._name} {postcode._name}, {country._name}' }, () => {}),
    };
    const c = new Carmen(conf);
    tape('index address', (t) => {
        const address = {
            id:1,
            properties: {
                'carmen:text': 'fake street',
                'carmen:center': [0,0],
                'carmen:addressnumber': ['9','10','7']
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,0],[0,0],[0,0]]
            }
        };
        queueFeature(conf.address, address, () => { buildQueued(conf.address, t.end); });
    });

    tape('Forward search for address with no LineString data', (t) => {
        c.geocode('9 fake street', { debug: true, full: true }, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.features[0].routable_points,
                undefined,
                'Forward geocode of address with no LineString data returns no routable_points');
            t.end();
        });
    });

})();



tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
