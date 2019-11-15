'use strict';
const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../../lib/indexer/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

const conf = {};
for (let i = 0; i < 100; i++) {
    conf['place-' + i] = new mem({ maxzoom: 6 }, () => {});
}

tape('queue features', (t) => {
    const q = queue();
    Object.keys(conf).forEach((c) => {
        q.defer((cb) => {
            const place = {
                id:1,
                properties: {
                    'carmen:text':'placey place',
                    'carmen:zxy':['6/32/32','6/34/32'],
                    'carmen:center':[0,0]
                }
            };
            queueFeature(conf[c], place, cb);
        });
    });
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

const c = new Carmen(conf);
tape('rejects a heavy emoji query quickly', (t) => {
    const start = +new Date();
    c.geocode(decodeURIComponent('%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82+%F0%9F%98%82'), {}, (err, res) => {
        t.ifError(err);
        t.equal(+new Date() - start < 100, true, 'takes less than 100ms to reject query');
        t.equal(res.features.length, 0, 'finds no features');
        t.end();
    });
});

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
