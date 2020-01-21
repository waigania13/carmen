'use strict';
// Geocoder_Categories Relevance Bump

const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
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
        queueFeature(conf.poi, [{
            id: 1,
            properties: {
                'carmen:text': 'delicious,tofu',
                'carmen:center': [0,0],
                category: 'vegetarian',
                'carmen:score': 1
            },
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        }, {
            id: 2,
            properties: {
                'carmen:text': 'delicious,pizza',
                'carmen:center': [0,0],
                category: 'pizza'
            },
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        }], () => buildQueued(conf.poi, t.end));
    });

    tape('Ensure categories were tokenized', (t) => {
        t.ok(conf.poi.categories.has('pizza'));
        t.ok(conf.poi.categories.has('pz'));
        t.end();
    });

    tape('test poi for non-category feature query', (t) => {
        c.geocode('delicious', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].id, 'poi.1', 'found delicious tofu');
            t.equals(res.features[0].place_name, 'delicious', 'found delicious');
            t.equals(res.features[0].relevance, 1.00);
            t.end();
        });
    });

    tape('test poi for category feature query', (t) => {
        c.geocode('pizza', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].id, 'poi.2', 'found delicious pizza');
            t.equals(res.features[0].place_name, 'delicious', 'found delicious');
            t.equals(res.features[0].relevance, 1.00);
            t.end();
        });
    });
})();

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
