'use strict';
// Ensure that results that have equal relev in phrasematch
// are matched against the 0.5 relev bar instead of 0.75

const tape = require('tape');
const Carmen = require('../..');
const mem = require('../../lib/sources/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../../lib/indexer/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

const conf = {
    country: new mem({ maxzoom: 6, geocoder_languages: ['en', 'es', 'ru', 'zh_Latn'], geocoder_languages_from_default: { 'ru': ['en'] }, geocoder_categories: ['coffee'] }, () => {}),
};
const c = new Carmen(conf);

tape('index country', (t) => {
    const country = {
        type: 'Feature',
        properties: {
            'carmen:center': [0, 0],
            'carmen:zxy': ['6/30/30'],
            'carmen:text': 'Russian Federation, Rossiyskaya Federatsiya,coffee',
            'carmen:text_ru': 'Российская Федерация',
            'carmen:text_zh_Latn': 'Elousi',
            'carmen:text_es': null,
            'carmen:geocoder_stack': 'ru'
        },
        id: 2,
        geometry: { type: 'MultiPolygon', coordinates: [] },
        bbox: [-11.25, 5.615, -5.625, 11.1784]
    };
    queueFeature(conf.country, country, t.end);
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

tape('russia => Russian Federation', (t) => {
    c.geocode('russia', { limit_verify:1, language: 'ru' }, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features[0].id, 'country.2');
        t.ok(res.features[0].relevance < 1, 'Relevance penalty was applied for out of language match');
        t.end();
    });
});

tape('rossiyskaya => Russian Federation', (t) => {
    c.geocode('rossiyskaya', { limit_verify:1, language: 'ru' }, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features[0].id, 'country.2');
        t.ok(res.features[0].relevance < 1, 'Relevance penalty was applied for out of language match');
        t.end();
    });
});

tape('coffee => Russian Federation', (t) => {
    c.geocode('coffee', { limit_verify:1, language: 'ru' }, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features[0].id, 'country.2');
        t.ok(res.features[0].relevance >= 1, 'Relevance penalty was not applied because categories are universal');
        t.end();
    });
});
