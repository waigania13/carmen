'use strict';
// Geocoder_Categories Relevance Bump

const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const queue = require('d3-queue').queue;
const { queueFeature, buildQueued } = require('../../lib/indexer/addfeature');

(() => {
    const conf = {
        poi: new mem({
            maxzoom: 6,
            geocoder_categories: [
                'pizza'
            ],
            geocoder_tokens: {
                pizza: 'pz'
            }
        }, () => {})
    };

    const c = new Carmen(conf);
    tape('index category POI', (t) => {
        const poi = {
            id: 1,
            properties: {
                'carmen:text': 'delicious,pizza',
                'carmen:center': [0,0],
                caegory: 'pizza'
            },
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        };
        queueFeature(conf.poi, poi, () => { buildQueued(conf.poi, t.end); });
    });

    tape('Ensure categories were tokenized', (t) => {
        t.ok(conf.poi.categories.has('pizza'));
        t.ok(conf.poi.categories.has('pz'));
        t.end();
    });

    tape('test poi for non-category feature query', (t) => {
        c.geocode('delicious', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'delicious', 'found delicious');
            t.equals(res.features[0].relevance, 1.00);
            t.end();
        });
    });

    tape('test poi for category feature query', (t) => {
        c.geocode('pizza', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'delicious', 'found delicious');
            t.equals(res.features[0].relevance, 1.01);
            t.end();
        });
    });
})();

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
