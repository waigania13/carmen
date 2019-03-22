'use strict';
const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const queue = require('d3-queue').queue;
const { queueFeature, buildQueued } = require('../../lib/indexer/addfeature');

const conf = {
    address: new mem({
        maxzoom: 6,
        geocoder_address: 1,
        geocoder_name:'address',
        geocoder_tokens: { 'Street': 'st' }
    }, () => {})
};
const c = new Carmen(conf);

tape('index address', (t) => {
    const addresses = [
        {
            id:100, // also present as id:103 and duplicates entry in id:101
            properties: {
                'carmen:text':'103 Main st',
                'carmen:center':[4,4],
            },
            geometry: {
                omitted: true,
                type: 'Point',
                coordinates: [4,4]
            }
        },
        {
            id:101,
            properties: {
                'carmen:text':'Main st',
                'carmen:center':[0,0],
                'carmen:addressnumber': ['100','101','102','103','100']
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,0],[1,1],[2,2],[3,3],[4,4]]
            }
        },
        {
            id:102, // duplicates entry in id:101
            properties: {
                'carmen:text':'Main street',
                'carmen:center':[0,0],
                'carmen:addressnumber': ['102']
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[4,4]]
            }
        },
        {
            id:103,
            properties: {
                'carmen:text':'103 Main st',
                'carmen:center':[4,4],
            },
            geometry: {
                omitted: true,
                type: 'Point',
                coordinates: [4,4]
            }

        }
    ];
    queueFeature(conf.address, addresses, t.end);
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

tape('101 Main st - allow dupes, has none', (t) => {
    c.geocode('101 Main st', { allow_dupes: true }, (err, res) => {
        t.ifError(err);
        t.equals(res.features.length, 2);
        t.deepEqual(res.features.map((v) => v.place_name), ['101 Main st', 'Main street']);
        t.end();
    });
});

tape('100 Main st - allow dupes', (t) => {
    c.geocode('100 Main st', { allow_dupes: true }, (err, res) => {
        t.ifError(err);
        t.equals(res.features.length, 3);
        t.deepEqual(res.features.map((v) => v.place_name), ['100 Main st', '100 Main st', 'Main street']);
        t.end();
    });
});

tape('100 Main st - no dupes', (t) => {
    c.geocode('100 Main st', { allow_dupes: false }, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features.map((v) => v.place_name), ['100 Main st', 'Main street']);
        t.equals(res.features.length, 2);
        t.end();
    });
});

tape('102 Main st - allow dupes', (t) => {
    c.geocode('102 Main st', { allow_dupes: true }, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features.map((v) => v.place_name), ['102 Main st', '102 Main street']);
        t.equals(res.features.length, 2);
        t.end();
    });
});

tape('102 Main st - no dupes', (t) => {
    c.geocode('102 Main st', { allow_dupes: false }, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features.map((v) => v.place_name), ['102 Main st']);
        t.equals(res.features.length, 1);
        t.end();
    });
});

tape('103 Main street - allow dupes', (t) => {
    c.geocode('103 Main street', { allow_dupes: true }, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features.map((v) => v.place_name), ['103 Main st', '103 Main st','103 Main st','Main street']);
        t.equals(res.features.length, 4);
        t.end();
    });
});

tape('103 Main street - no dupes', (t) => {
    c.geocode('103 Main street', { allow_dupes: false }, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features.map((v) => v.place_name), ['103 Main st', 'Main street']);
        t.equals(res.features[0].id, 'address.101', 'Prefer non-omitted');
        t.equals(res.features.length, 2);
        t.end();
    });
});

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
