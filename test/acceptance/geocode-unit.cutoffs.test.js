'use strict';
// Test geocoder_tokens

const tape = require('tape');
const Carmen = require('../..');
const mem = require('../../lib/sources/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../../lib/indexer/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

(() => {
    const conf = {
        country: new mem({ maxzoom: 6 }, () => {}),
        place: new mem({ maxzoom: 6 }, () => {})
    };

    const c = new Carmen(conf);
    tape('index country - United States', (t) => {
        queueFeature(conf.country, {
            id: 1,
            properties: {
                'carmen:text':'United States',
                'carmen:center': [0,0],
                'carmen:zxy': ['6/32/32']
            }
        }, t.end);
    });

    tape('index country - United Kingdom', (t) => {
        queueFeature(conf.country, {
            id: 2,
            properties: {
                'carmen:text':'United Kingdom',
                'carmen:center': [0, 1],
                'carmen:zxy': ['6/32/32']
            }
        }, t.end);
    });

    tape('index places in the United States', (t) => {
        const q = queue(1);
        for (let i = 1; i <= 11; i++) q.defer((i, done) => {
            queueFeature(conf.place, {
                id:i,
                properties: {
                    'carmen:text':'place ' + i,
                    'carmen:center': [0,0],
                },
                geometry: {
                    type: 'Point',
                    coordinates: [0,0]
                }
            }, done);
        }, i);
        q.awaitAll(t.end);
    });

    tape('index place 1 in United Kingdom', (t) => {
        queueFeature(conf.place, {
            id: 50,
            properties: {
                'carmen:text':'place 1',
                'carmen:center': [0,1],
            },
            geometry: {
                type: 'Point',
                coordinates: [0,1]
            }
        }, t.end);
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

    tape('max_correction_length > query length', (t) => {
        // Number of words in the query = 6
        // parameterized max_correction_length = 5
        // this test case should not return results because we should not attempt fuzzy search
        // for a query whose length is greater than the max_correction_length
        c.geocode('place places 11 unitted states america however extreme', { max_correction_length: 0 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].relevance < 1, true, 'ok, returns a feature with relevance < 1');
            t.end();
        });
    });

    tape('max_correction_length <= query length', (t) => {
        // Number of words in the query = 6
        // default max_correction_length = 8
        // this test case should return results because we attempt fuzzy search
        // for a query whose length <= max_correction_length
        c.geocode('places places 11 unitted states america', { }, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.features[0].place_name, 'place 11, United States', 'ok, returns a result when max_correction_length <= query length');
            t.end();
        });
    });

    tape('verifymatch_stack_limit=1', (t) => {
        // providing parameter verifymatch_stack_limit=1 reduces the number of indexes sent to VerifyMatch
        // only returns place 1 from the United States
        c.geocode('place 1 united', { autocomplete: true, verifymatch_stack_limit: 1 }, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.features[0].place_name, 'place 1, United States', 'returns place 1 from United States');
            t.deepEquals(res.features[0].center, [0,0], 'Center for place 1 from United States');
            t.error(res.features[1], undefined, 'Does not include place 1 from United Kingdom');
            t.end();
        });
    });

    tape('verifymatch_stack_limit > 1', (t) => {
        // providing parameter verifymatch_stack_limit > 1 increases the number of indexes to verifymatch
        c.geocode('place 1 united', { autocomplete: true, verifymatch_stack_limit: 30 }, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.features[0].place_name, 'place 1, United States', 'returns place 1 from United States');
            t.deepEquals(res.features[0].center, [0,0], 'Center for place 1 from United States');
            t.deepEquals(res.features[1].center, [0,1], 'Includes results for id.112 place 1');
            t.end();
        });
    });
})();
