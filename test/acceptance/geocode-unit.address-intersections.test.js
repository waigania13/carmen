'use strict';

const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const queue = require('d3-queue').queue;
const { queueFeature, buildQueued } = require('../../lib/indexer/addfeature');


(() => {
    const conf = {
        address: new mem({
            maxzoom: 14,
            geocoder_address: 1,
            geocoder_tokens: { st: 'street', nw: 'northwest'}
        }, () => {})
    };

    const c = new Carmen(conf);

    tape('index intersection', (t) => {
        const address = {
            id: 3,
            properties: {
                'carmen:text': '9th street northwest and F street northwest,F street northwest and 9th street northwest,9th st nw and F st nw,F st nw and 9th st nw',
                'carmen:center': [0,0],
            },
            geometry: {
                type: 'Point',
                coordinates: [0,0]
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

    tape('Searching for the intersection - 9th st nw and F st nw', (t) => {
        c.geocode('9th st nw and F st nw', {}, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '9th street northwest and F street northwest', 'found intersection');
            t.end();
        });
    });

    tape('Searching for the intersection - 9th street northwest and F street northwest', (t) => {
        c.geocode('9th street northwest and F street northwest', {}, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '9th street northwest and F street northwest', 'found intersection');
            t.end();
        });
    });

    tape('Searching for the intersection - 9th st nw & F st nw', (t) => {
        c.geocode('9th street northwest & F street northwest', {}, (err, res) => {
            t.deepEquals(res.query, [ '9th', 'street', 'northwest', 'f', 'street', 'northwest' ], 'does not convert & => and');
            t.end();
        });
    });
})();

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
