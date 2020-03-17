'use strict';
const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const queue = require('d3-queue').queue;
const { queueFeature, buildQueued } = require('../../lib/indexer/addfeature');

const country = new mem(null, () => {});
const region = new mem(null, () => {});
const place = new mem(null, () => {});
const confA = {
    country: country,
    place: place
};
const confB = {
    country: country,
    region: region,
    place: place
};
const carmenA = new Carmen(confA);
const carmenB = new Carmen(confB);

tape('index country', (t) => {
    t.ok(carmenA);
    queueFeature(confA.country, {
        id:1,
        properties: {
            'carmen:text':'america',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    }, t.end);
});
tape('index region', (t) => {
    t.ok(carmenB);
    queueFeature(confB.region, {
        id:1,
        properties: {
            'carmen:text':'illinois',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    }, t.end);
});
tape('index place', (t) => {
    queueFeature(confA.place, {
        id:1,
        properties: {
            'carmen:text':'chicago',
            'carmen:zxy':['6/32/32','6/33/32'],
            'carmen:center':[0,0]
        }
    }, t.end);
});
tape('build queued features', (t) => {
    const q = queue();
    Object.keys(confA).forEach((c) => {
        q.defer((cb) => {
            buildQueued(confA[c], cb);
        });
    });
    Object.keys(confB).forEach((c) => {
        q.defer((cb) => {
            buildQueued(confB[c], cb);
        });
    });
    q.awaitAll(t.end);
});
tape('chicago (conf a)', (t) => {
    const a = new Carmen(confA);
    a.geocode('chicago', {}, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'chicago, america');
        t.deepEqual(res.features[0].id, 'place.1');
        t.end();
    });
});
// tape('chicago (conf b)', (t) => {
//     const b = new Carmen(confB);
//     b.geocode('chicago', {}, (err, res) => {
//         t.ifError(err);
//         t.deepEqual(res.features[0].place_name, 'chicago, illinois, america');
//         t.deepEqual(res.features[0].id, 'place.1');
//         t.end();
//     });
// });

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
