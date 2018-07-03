'use strict';
const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const { queueFeature, buildQueued } = require('../../lib/indexer/addfeature');
const queue = require('d3-queue').queue;

const conf = {
    country: new mem(null, () => {}),
    region: new mem(null, () => {}),
    postcode: new mem(null, () => {}),
    place: new mem(null, () => {}),
    neighborhood: new mem(null, () => {}),
    poi: new mem({
        maxzoom:6,
        geocoder_name: 'address',
        geocoder_type: 'poi'
    }, () => {})
};
const c = new Carmen(conf);

tape('index country', (t) => {
    const country = {
        id:1,
        properties: {
            'carmen:text':'Canada',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    queueFeature(conf.country, country, t.end);
});

tape('index region', (t) => {
    const region = {
        id:1,
        properties: {
            'carmen:text':'Newfoundland and Labrador',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    queueFeature(conf.region, region, t.end);
});

tape('index postcode', (t) => {
    const postcode = {
        id:1,
        properties: {
            'carmen:text':'A1N 4Y1',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    queueFeature(conf.postcode, postcode, t.end);
});

tape('index place', (t) => {
    const place = {
        id:1,
        properties: {
            'carmen:text':'Mount Pearl',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    queueFeature(conf.place, place, t.end);
});

tape('index neighborhood', (t) => {
    const neighborhood = {
        id:1,
        properties: {
            'carmen:text':'Waterford Valley',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    queueFeature(conf.neighborhood, neighborhood, t.end);
});

tape('index poi', (t) => {
    const q = queue(1);
    for (let i = 1; i < 20; i++) q.defer((i, done) => {
        queueFeature(conf.poi, {
            id:i,
            properties: {
                'carmen:text':'Canada Post ' + i + 'a',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0]
            }
        }, done);
    }, i);
    q.awaitAll(t.end);
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

tape('Descending Gappy', (t) => {
    c.geocode('Waterford Valley Canada', {}, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features[0].id, 'neighborhood.1');
        t.end();
    });
});

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
