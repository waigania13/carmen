// Interpolation between range feature gaps.
'use strict';

const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const { queueFeature, buildQueued } = require('../../lib/indexer/addfeature');

(() => {
    const conf = {
        address: new mem({ maxzoom: 6, geocoder_address: 1 }, () => {})
    };
    const c = new Carmen(conf);
    tape('index address', (t) => {
        const address = {
            id:1,
            properties: {
                'carmen:text':'fake street',
                'carmen:center':[0,0],
                'carmen:rangetype':'tiger',
                'carmen:lfromhn': '0',
                'carmen:ltohn': '100',
            },
            geometry: {
                type:'LineString',
                coordinates:[[0,0],[0,100]]
            }
        };
        queueFeature(conf.address, address, () => { buildQueued(conf.address, t.end); });
    });
    tape('test address query with address range', (t) => {
        c.geocode('9 fake street', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '9 fake street', 'found 9 fake street');
            t.equals(res.features[0].relevance, 1.00);
            t.end();
        });
    });
})();

(() => {
    const conf = {
        address: new mem({ maxzoom: 6, geocoder_address: 1 }, () => {})
    };
    const c = new Carmen(conf);
    tape('tiger, between the lines', (t) => {
        const address = {
            id:1,
            properties: {
                'carmen:text':'fake street',
                'carmen:center':[0,0],
                'carmen:rangetype':'tiger',
                'carmen:lfromhn': ['0','104'],
                'carmen:ltohn': ['100','200'],
            },
            geometry: {
                type:'MultiLineString',
                coordinates: [
                    [[0,0], [0,10]],
                    [[0,11], [0,20]],
                ]
            }
        };
        queueFeature(conf.address, address, () => { buildQueued(conf.address, t.end); });
    });

    tape('test tiger interpolation house number', (t) => {
        c.geocode('102 fake street', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '102 fake street', 'found 102 fake street');
            t.equals(res.features[0].relevance, 1.00);
            t.end();
        });
    });
})();

(() => {
    const conf = {
        address: new mem({ zoom: 14, maxzoom: 14, geocoder_address: 1 }, () => {})
    };
    const c = new Carmen(conf);
    tape('tiger, one omitted', (t) => {
        const address = {
            id:1,
            properties: {
                'carmen:text':'fake street',
                'carmen:center':[0,0],
                'carmen:rangetype':'tiger',
                'carmen:lfromhn': ['0','104'],
                'carmen:ltohn': ['100','200'],
            },
            geometry: {
                type:'MultiLineString',
                coordinates: [
                    [[0,0], [0,0.5]],
                    [[0,0.6], [0,0.8]],
                ]
            }
        };
        queueFeature(conf.address, address, t.end);
    });
    tape('tiger, one not omitted', (t) => {
        const address = {
            id:2,
            properties: {
                'carmen:text':'far street',
                'carmen:center':[0,0],
                'carmen:rangetype':'tiger',
                'carmen:lfromhn': '0',
                'carmen:ltohn': '200',
            },
            geometry: {
                type:'LineString',
                coordinates:[[0,0.5],[0,1]]

            }
        };
        queueFeature(conf.address, address, () => { buildQueued(conf.address, t.end); });
    });

    tape('test tiger interpolation house number', (t) => {
        c.geocode('102 f', {}, (err, res) => {
            t.equals(res.features.length, 2, 'got both features back');
            t.equals(res.features[0].id, 'address.2', 'got back non-omitted feature first');
            t.equals(typeof res.features[0].geometry.omitted, 'undefined', 'omitted not set on address.2');
            t.equals(res.features[1].id, 'address.1', 'got back omitted feature second');
            t.equals(res.features[1].geometry.omitted, true, 'omitted set on address.1');
            t.ifError(err);
            t.end();
        });
    });

    tape('test tiger interpolation house number', (t) => {
        c.geocode('102 f', {proximity: [0, 0.5]}, (err, res) => {
            t.equals(res.features.length, 2, 'got both features back');
            t.equals(res.features[0].id, 'address.1', 'got back omitted feature first with close prox point');
            t.equals(res.features[0].geometry.omitted, true, 'omitted set on address.1');
            t.equals(res.features[1].id, 'address.2', 'got back non-omitted feature second');
            t.equals(typeof res.features[1].geometry.omitted, 'undefined', 'omitted not set on address.2');
            t.ifError(err);
            t.end();
        });
    });

    tape('test tiger interpolation house number', (t) => {
        c.geocode('102 f', {proximity: [0, -3]}, (err, res) => {
            t.equals(res.features.length, 2, 'got both features back');
            t.equals(res.features[0].id, 'address.2', 'got back non-omitted feature first');
            t.equals(typeof res.features[0].geometry.omitted, 'undefined', 'omitted not set on address.2');
            t.equals(
                res.features[1].id,
                'address.1',
                'got back omitted feature second even with closer prox point if outside radius'
            );
            t.equals(res.features[1].geometry.omitted, true, 'omitted set on address.1');
            t.ifError(err);
            t.end();
        });
    });
})();

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});

