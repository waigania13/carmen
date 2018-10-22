'use strict';

const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../../lib/indexer/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

/**
 * This test ensures that the sort algo in spatialMatch (pre cutoff)
 * Uses the bbox of a given index to sort results if a proximity point is uses
 *
 * Indexes where the proximity point exists within the bbox will be sorted
 * higher than those without
 */
const conf = {
    poi1: new mem({
        maxzoom: 6,
        geocoder_type: 'poi1',
        geocoder_name: 'poi',
        bounds: [-26.191406,-17.140790,33.574219,8.754795]
    }, () => {}),
    poi2: new mem({
        maxzoom: 6,
        geocoder_type: 'poi2',
        geocoder_name: 'poi',
        bounds: [-26.191406,-17.140790,33.574219,8.754795]
    }, () => {}),
    poi3: new mem({
        maxzoom: 6,
        geocoder_type: 'poi3',
        geocoder_name: 'poi',
        bounds: [-26.191406,-17.140790,33.574219,8.754795]
    }, () => {}),
    poi4: new mem({
        maxzoom: 6,
        geocoder_type: 'poi4',
        geocoder_name: 'poi',
        bounds: [-26.191406,-17.140790,33.574219,8.754795]
    }, () => {}),
    poi5: new mem({
        maxzoom: 6,
        geocoder_type: 'poi5',
        geocoder_name: 'poi',
        bounds: [-26.191406,-17.140790,33.574219,8.754795]
    }, () => {}),
    poi6: new mem({
        maxzoom: 6,
        geocoder_type: 'poi6',
        geocoder_name: 'poi',
        bounds: [-26.191406,-17.140790,33.574219,8.754795]
    }, () => {}),
    good: new mem({
        maxzoom: 6,
        geocoder_type: 'good',
        geocoder_name: 'poi',
        bounds: [-106.171875,30.297018,-53.085938,54.059388]
    }, () => {})
};
const c = new Carmen(conf);

for (let i = 1; i < 7; i++) {
    tape(`index poi${i}`, (t) => {
        const poi = {
            id: 1,
            properties: {
                'carmen:text': 'poi',
                'carmen:center':[0,0]
            },
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        };
        queueFeature(conf[`poi${i}`], poi, t.end);
    });
}

tape('index goodpoi', (t) => {
    const poi = {
        id: 1,
        properties: {
            'carmen:text':'poi I am good',
            'carmen:center':[-81.74573, 41.49342]
        },
        geometry: {
            type: 'Point',
            coordinates: [-81.74573, 41.49342]
        }
    };
    queueFeature(conf.good, poi, t.end);
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

tape('Proximityless query', (t) => {
    c.geocode('poi', {}, (err, res) => {
        t.error(err);
        t.ok(res.features[0].id !== 'goodpoi.1');
        t.end();
    });
});

tape('Proximity query', (t) => {
    c.geocode('poi', {
        spatialmatch_stack_limit: 2,
        proximity: [-81.74573, 41.49342]
    }, (err, res) => {
        t.error(err);
        t.equals(res.features[0].id, 'good.1');
        t.end();
    });
});

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});

