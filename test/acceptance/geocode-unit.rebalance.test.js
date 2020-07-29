'use strict';
const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const queue = require('d3-queue').queue;
const { queueFeature, buildQueued } = require('../../lib/indexer/addfeature');

const conf = {
    region: new mem(null, () => {}),
    postcode: new mem(null, () => {}),
    address: new mem({
        maxzoom: 6,
        geocoder_address: 1,
    }, () => {})
};
/* eslint-disable no-unused-vars */
const c = new Carmen(conf);

// the region contains both the postcode and the address, below, but the address
// isn't in the postcode

tape('index region', (t) => {
    const region = {
        id:1,
        properties: {
            'carmen:center': [0,0],
            'carmen:score': 50,
            'carmen:text':'georgia'
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [-20,-20],
                [-20,20],
                [20,20],
                [20,-20],
                [-20,-20],
            ]]
        }
    };
    queueFeature(conf.region, region, t.end);
});

tape('index postcode', (t) => {
    const postcode = {
        id:1,
        properties: {
            'carmen:text':'80138',
            'carmen:center': [0,0],
            'carmen:score': 50
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [-20,-20],
                [-20,0],
                [0,0],
                [0,-20],
                [-20,-20],
            ]]
        }
    };
    queueFeature(conf.postcode, postcode, t.end);
});

tape('index address', (t) => {
    const address = {
        id:1,
        properties: {
            'carmen:text':'Main St',
            'carmen:center':[10,10],
            'carmen:addressnumber': ['11027']
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [[10,10]]
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

tape('Check relevance scoring', (t) => {
    c.geocode('11027 main st georgia 80138', { limit_verify: 2 }, (err, res) => {
        t.ifError(err);
        t.equal(res.features.length, 2, 'got both results back');
        t.equal(res.features[0].id, 'address.1', 'address beats postcode even with lower score');
        t.equal(res.features[1].id, 'postcode.1', 'address beats postcode even with lower score');
        t.assert(res.features[0].relevance > res.features[1].relevance, 'address has a higher relevance than postcode');
        t.end();
    });
});

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
