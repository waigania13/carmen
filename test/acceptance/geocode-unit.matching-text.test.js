'use strict';
const tape = require('tape');
const Carmen = require('../..');
const mem = require('../../lib/sources/api-mem');
const context = require('../../lib/geocoder/context');
const queue = require('d3-queue').queue;
const addFeature = require('../../lib/indexer/addfeature');

const queueFeature = addFeature.queueFeature;
const buildQueued = addFeature.buildQueued;

(() => {
    const conf = {
        country: new mem({ maxzoom: 6, geocoder_name: 'country', geocoder_format: '{{country.name}}' }, () => {}),
        region: new mem({ maxzoom: 6, geocoder_name: 'region', geocoder_format: '{{region.name}} {{country.name}}' }, () => {}),
        poi: new mem({
            maxzoom: 14,
            geocoder_categories: [
                'coffee',
                'arena'
            ],
        }, () => {})
    };
    const c = new Carmen(conf);
    tape('index country', (t) => {
        const country = {
            type: 'Feature',
            properties: {
                'carmen:center': [0,0],
                'carmen:zxy': ['6/32/32'],
                'carmen:text': 'United States,America'
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
    tape('index region', (t) => {
        const region = {
            type: 'Feature',
            properties: {
                'carmen:center': [0,0],
                'carmen:zxy': ['6/32/32'],
                'carmen:text': 'Kansas,Jayhawks'
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
        queueFeature(conf.region, region, t.end);
    });
    tape('index poi', (t) => {
        const poi = {
            type: 'Feature',
            properties: {
                'carmen:center': [0,0],
                'carmen:zxy': ['14/8192/8192'],
                'carmen:text': 'Cool Beans,CB cafe, coffee'
            },
            id: 1,
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        };
        const poi2 = {
            type: 'Feature',
            properties: {
                'carmen:center': [0,0],
                'carmen:zxy': ['14/8192/8192'],
                'carmen:text': 'Sand,restaurant',
                'carmen:text_es': 'arena'
            },
            id: 2,
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        };
        const poi3 = {
            type: 'Feature',
            properties: {
                'carmen:center': [0,0],
                'carmen:zxy': ['14/8192/8192'],
                'carmen:text': 'Whole Foods Market,Whole Foods #340',
                'carmen:text_es': 'arena'
            },
            id: 3,
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        };
        const q = queue();
        q.defer(queueFeature, conf.poi, poi);
        q.defer(queueFeature, conf.poi, poi2);
        q.defer(queueFeature, conf.poi, poi3);
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
    tape('kansas america - region primary name and country synonym', (t) => {
        c.geocode('kansas america', { limit_verify:1 }, (err, res) => {
            t.ifError(err);
            t.equal(res.features[0].place_name, 'Kansas United States', 'place_name should be the primary region name and country name');
            t.equal(res.features[0].matching_text, undefined, 'matching_text should be empty');
            t.equal(res.features[0].matching_place_name, 'Kansas America', 'matching_place_name should include matching context name');
            t.end();
        });
    });
    tape('america - country synonym', (t) => {
        c.geocode('america', { limit_verify:1 }, (err, res) => {
            t.ifError(err);
            t.equal(res.features[0].place_name, 'United States', 'place_name should be the primary country name');
            t.equal(res.features[0].matching_text, 'America', 'matching_text should be the country synonym');
            t.equal(res.features[0].matching_place_name, 'America');
            t.end();
        });
    });
    tape('jayhawks - region synonym', (t) => {
        c.geocode('jayhawks', { limit_verify:1 }, (err, res) => {
            t.ifError(err);
            t.equal(res.features[0].place_name, 'Kansas United States', 'place_name should be the primary region and context name');
            t.equal(res.features[0].matching_text, 'Jayhawks', 'matching_text should be the region synonym');
            t.equal(res.features[0].matching_place_name, 'Jayhawks United States', 'matching_place_name should be the matching region synonym and primary context name');
            t.end();
        });
    });
    tape('CB Cafe, Jayhawks - poi synonym and region synonym', (t) => {
        c.geocode('CB cafe, Jayhawks', { limit_verify: 1 }, (err, res) => {
            t.ifError(err, 'No errors');
            t.equal(res.features[0].place_name, 'Cool Beans, Kansas, United States', 'Place name should be the primary poi name and primary context name');
            t.equal(res.features[0].matching_text, 'CB cafe', 'matching_text should be the matching poi synonym.');
            t.equal(res.features[0].matching_place_name, 'CB cafe, Jayhawks, United States', 'matching_place_name should be the matching poi synonym and matching context');
            t.end();
        });
    });
    tape('coffee, Jayhawks - poi category and region synonym', (t) => {
        c.geocode('coffee, Jayhawks', { limit_verify: 1 }, (err, res) => {
            t.ifError(err, 'No errors');
            t.equal(res.features[0].place_name, 'Cool Beans, Kansas, United States', 'Place name should be the primary poi name and primary context name');
            t.equal(res.features[0].matching_text, undefined, 'matching_text should be undefined for category matches');
            t.equal(res.features[0].matching_place_name, 'Cool Beans, Jayhawks, United States', 'matching_place_name should be the primary poi name and matching context');
            t.end();
        });
    });
    tape('arena, Jayhawks - poi translation that looks like a category and region synonym', (t) => {
        c.geocode('arena, Jayhawks', { limit_verify: 1 }, (err, res) => {
            t.ifError(err, 'No errors');
            t.equal(res.features[0].place_name, 'Sand, Kansas, United States', 'Place name should be the primary poi name and primary context name');
            t.equal(res.features[0].matching_text, 'arena', 'matching_text should be the matching translation, even if the translation is the same as a category name');
            t.equal(res.features[0].matching_place_name, 'arena, Jayhawks, United States', 'matching_place_name should be the primary poi name and matching context');
            t.end();
        });
    });
    tape('whole foods - phrase hash collision', (t) => {
        c.geocode('whole foods #340', { limit_verify: 1 }, (err, res) => {
            t.ifError(err, 'No errors');
            t.equal(res.features[0].matching_text, 'Whole Foods #340', 'in the event of a phrase hash collision, levenshtein distance should select the right synonym');
            t.end();
        });
    });
})();

(() => {
    const conf = {
        address: new mem({ maxzoom: 6, geocoder_address: 1, geocoder_format: '{{address.number}} {{address.name}}' }, () => {})
    };
    const c = new Carmen(conf);
    tape('index address', (t) => {
        const address = {
            id: 1,
            type: 'Feature',
            properties: {
                'carmen:center': [0,0],
                'carmen:zxy': ['6/32/32'],
                'carmen:text': 'US Highway 123,Main St East',
                'carmen:addressnumber': [43, 32, 243]
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,0], [0,0], [0,0]]
            }
        };
        queueFeature(conf.address, address, t.end);
    });
    tape('build queued features', (t) => {
        const q = queue();
        Object.keys(conf).forEach((c) => {
            q.defer((cb) => { buildQueued(conf[c], cb); });
        });
        q.awaitAll(t.end);
    });
    tape('US Highway 123', (t) => {
        c.geocode('43 US Highway 123', {}, (err, res) => {
            t.ifError(err);
            t.equal(res.features[0].place_name, '43 US Highway 123');
            t.equal(res.features[0].matching_text, undefined);
            t.equal(res.features[0].matching_place_name, undefined);
            t.end();
        });
    });
    tape('43 Main St East', (t) => {
        c.geocode('43 Main St East', {}, (err, res) => {
            t.ifError(err);
            t.equal(res.features[0].place_name, '43 US Highway 123');
            t.equal(res.features[0].matching_text, 'Main St East');
            t.equal(res.features[0].matching_place_name, '43 Main St East');
            t.end();
        });
    });
    tape('243 Main St East', (t) => {
        c.geocode('243 Main St East', {}, (err, res) => {
            t.ifError(err);
            t.equal(res.features[0].place_name, '243 US Highway 123');
            t.equal(res.features[0].matching_text, 'Main St East');
            t.equal(res.features[0].matching_place_name, '243 Main St East');
            t.end();
        });
    });
})();

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
