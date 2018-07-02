// Test score handling across indexes
'use strict';

const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const { queueFeature, buildQueued } = require('../../lib/indexer/addfeature');

// Confirm that disabling autocomplete works, and that in situations where an autocomplete
// result scores highest, the winner changes depending on whether or not autocomplete is enabled
const conf = { place: new mem(null, () => {}) };
const c = new Carmen(conf);
const places = [
    {
        id:1,
        properties: {
            'carmen:score': 100,
            'carmen:text':'abqde',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    },
    {
        id:2,
        properties: {
            'carmen:score': 10,
            'carmen:text':'abcde',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    }
];
queueFeature(conf.place, places, (err) => {
    buildQueued(conf.place, () => {
        tape('abcde - with fuzzy', (t) => {
            c.geocode('abcde', { limit_verify:1, autocomplete: 0, fuzzyMatch: 1 }, (err, res) => {
                t.ifError(err);
                t.deepEqual(res.features[0].place_name, 'abqde', 'abqde wins for abcde with fuzzy');
                t.deepEqual(res.features[0].id, 'place.1');
                t.end();
            });
        });
        tape('abcde - without fuzzy', (t) => {
            c.geocode('abcde', { limit_verify:1, autocomplete: 0, fuzzyMatch: 0 }, (err, res) => {
                t.ifError(err);
                t.deepEqual(res.features[0].place_name, 'abcde', 'abcde wins for abcde without fuzzy');
                t.deepEqual(res.features[0].id, 'place.2');
                t.end();
            });
        });
        tape('teardown', (t) => {
            context.getTile.cache.reset();
            t.end();
        });
    });
});


