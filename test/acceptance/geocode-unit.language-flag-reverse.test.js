'use strict';
// Ensure that results that have equal relev in phrasematch
// are matched against the 0.5 relev bar instead of 0.75

const tape = require('tape');
const Carmen = require('../..');
const mem = require('../../lib/sources/api-mem');
const context = require('../../lib/geocoder/context');
const queue = require('d3-queue').queue;
const addFeature = require('../../lib/indexer/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

(() => {
    const conf = {
        country: new mem({ maxzoom: 6, geocoder_name: 'country', geocoder_languages: ['zh'] }, () => {}),
        place: new mem({ maxzoom: 6, geocoder_name: 'place', geocoder_languages: ['zh'], geocoder_format_zh: '{{country.name}}{{region.name}}{{place.name}}' }, () => {}),
    };
    const c = new Carmen(conf);

    tape('index country', (t) => {
        const country = {
            type: 'Feature',
            properties: {
                'carmen:center': [0,0],
                'carmen:zxy': ['6/32/32'],
                'carmen:text_zh': '中国',
                'carmen:text': 'China'
            },
            id: 1,
            geometry: {
                type: 'MultiPolygon',
                coordinates: [
                    [[[0,-5.615985819155337],[0,0],[5.625,0],[5.625,-5.615985819155337],[0,-5.615985819155337]]]
                ]
            },
            bbox: [0,-5.615985819155337,5.625,0]
        };
        queueFeature(conf.country, country, t.end);
    });

    tape('index city', (t) => {
        const place = {
            type: 'Feature',
            properties: {
                'carmen:center': [0,0],
                'carmen:zxy': ['6/32/32'],
                'carmen:text_zh': '北京市',
                'carmen:text': 'Beijing'
            },
            id: 1,
            geometry: {
                type: 'MultiPolygon',
                coordinates: [
                    [[[0,-5.615985819155337],[0,0],[5.625,0],[5.625,-5.615985819155337],[0,-5.615985819155337]]]
                ]
            },
            bbox: [0,-5.615985819155337,5.625,0]
        };
        queueFeature(conf.place, place, t.end);
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

    tape('中国 => China', (t) => {
        c.geocode('中国', { limit_verify:1 }, (err, res) => {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'China');
            t.deepEqual(res.features[0].id, 'country.1');
            t.end();
        });
    });

    tape('北京市 => Beijing', (t) => {
        c.geocode('北京市', { limit_verify:1 }, (err, res) => {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'Beijing, China');
            t.deepEqual(res.features[0].id, 'place.1');
            t.end();
        });
    });

    tape('Beijing, China => 中国北京市', (t) => {
        c.geocode('Beijing, China', { limit_verify:1, language: 'zh' }, (err, res) => {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, '中国北京市');
            t.deepEqual(res.features[0].id, 'place.1');
            t.end();
        });
    });

    tape('北京市, 中国 => Beijing, China', (t) => {
        c.geocode('北京市, 中国', { limit_verify:1 }, (err, res) => {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'Beijing, China');
            t.deepEqual(res.features[0].id, 'place.1');
            t.end();
        });
    });

    // fails
    tape('北京市中国 (BeijingChina) => Beijing, China', (t) => {
        c.geocode('北京市中国', { limit_verify:1 }, (err, res) => {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'Beijing, China');
            t.deepEqual(res.features[0].id, 'place.1');
            t.end();
        });
    });

    // fails
    tape('中国北京市 (ChinaBeijing) => Beijing, China', (t) => {
        c.geocode('中国北京市', { limit_verify:1 }, (err, res) => {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'Beijing, China');
            t.deepEqual(res.features[0].id, 'place.1');
            t.end();
        });
    });
})();

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
