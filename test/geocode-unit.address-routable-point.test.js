// Tests whether routable_points is added to geocoding results
'use strict';
const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

// Test geocoder_address formatting + return place_name as US style address (address number follows name)
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

    tape('Forward search for interpolated address and return routable points', (t) => {
        c.geocode('9 fake street', { limit_verify: 1, debug: true, full: true }, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.features[0].routable_points, [[1.111, 1.11]], 'Forward geocode of interpolated address result has correct routable_point');
            t.end();
        });
    });

    tape('Reverse geocode a point and return routable points', (t) => {
        c.geocode('1.111, 1.111', { limit_verify: 1, debug: true, full: true }, (err, res) => {
            t.ifError(err);
            console.log(res);
            t.deepEquals(res.features[0].routable_points, [[1.111, 1.11]], 'Reverse geocode of interpolated address result has correct routable_point');
            t.end();
        });
    });
})();


tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
