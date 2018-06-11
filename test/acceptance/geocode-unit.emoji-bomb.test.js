'use strict';
const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');

const conf = {};
for (let i = 0; i < 100; i++) {
    conf['place-' + i] = new mem({ maxzoom: 6 }, () => {});
}

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

