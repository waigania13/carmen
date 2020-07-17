'use strict';
// Alphanumeric and hyphenated housenumbers

const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const queue = require('d3-queue').queue;
const { queueFeature, buildQueued } = require('../../lib/indexer/addfeature');


const conf = {
    country: new mem({ maxzoom: 6 }, () => {}),
    postcode: new mem({ maxzoom: 6 }, () => {}),
    address: new mem({ maxzoom: 6, geocoder_address: 1 }, () => {})
};
const c = new Carmen(conf);
tape('index data', (t) => {
    const q = queue(1);
    q.defer((cb) => queueFeature(
        conf.address,
        {
            id: 1,
            properties: {
                'carmen:text': 'fake street',
                'carmen:center': [0,0],
                'carmen:addressnumber': ['9B', '10C', '7'],
                'carmen:format': 'X {{address.number}} {{address.name}}, {{postcode.name}}, {{country.name}}',
                'carmen:format_en': 'Y {{address.number}} {{address.name}}, {{postcode.name}}, {{country.name}}'
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,0],[0,0],[0,0]]
            }
        },
        cb
    ));
    q.defer((cb) => queueFeature(
        conf.address,
        {
            id: 2,
            properties: {
                'carmen:text': 'other street',
                'carmen:center': [0,0],
                'carmen:addressnumber': ['9B', '10C', '7']
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,0],[0,0],[0,0]]
            }
        },
        cb
    ));
    q.defer((cb) => queueFeature(
        conf.postcode,
        {
            id: 3,
            properties: {
                'carmen:text': '12345',
                'carmen:center': [0,0],
                'carmen:format': 'Z {{postcode.name}}, {{country.name}}'
            },
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        },
        cb
    ));
    q.defer((cb) => queueFeature(
        conf.country,
        {
            id: 4,
            properties: {
                'carmen:text': 'america',
                'carmen:center': [0,0]
            },
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        },
        cb
    ));

    q.defer((cb) => buildQueued(conf.address, cb));
    q.defer((cb) => buildQueued(conf.postcode, cb));
    q.defer((cb) => buildQueued(conf.country, cb));

    q.awaitAll(t.end);
});

tape('test address template', (t) => {
    c.geocode('9b fake street', { limit_verify: 1 }, (err, res) => {
        t.ifError(err);
        t.equals(res.features[0].place_name, 'X 9b fake street, 12345, america', 'overrode address template');
        t.end();
    });
});

tape('test regular address', (t) => {
    c.geocode('9b other street', { limit_verify: 1 }, (err, res) => {
        t.ifError(err);
        t.equals(res.features[0].place_name, '9b other street, 12345, america', 'didn\'t override address template');
        t.end();
    });
});

tape('test address template with language', (t) => {
    c.geocode('9b fake street', { limit_verify: 1, language: 'en' }, (err, res) => {
        t.ifError(err);
        t.equals(res.features[0].place_name, 'Y 9b fake street, 12345, america', 'overrode address template');
        t.end();
    });
});

tape('test address template with approximate language', (t) => {
    c.geocode('9b fake street', { limit_verify: 1, language: 'en-US' }, (err, res) => {
        t.ifError(err);
        t.equals(res.features[0].place_name, 'Y 9b fake street, 12345, america', 'overrode address template');
        t.end();
    });
});

tape('test postcode override', (t) => {
    c.geocode('12345', { limit_verify: 1 }, (err, res) => {
        t.ifError(err);
        t.equals(res.features[0].place_name, 'Z 12345, america', 'overrode postcode template');
        t.end();
    });
});

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
