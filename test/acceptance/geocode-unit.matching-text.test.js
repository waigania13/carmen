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
        country: new mem({ maxzoom: 6, geocoder_name: 'country', geocoder_format: '{country._name}' }, () => {}),
        region: new mem({ maxzoom: 6, geocoder_name: 'region', geocoder_format: '{region._name} {country._name}' }, () => {}),
        poi: new mem({
            maxzoom: 14,
            geocoder_categories: [
                'coffee'
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
                'carmen:text': 'Cool Beans,CB cafe,coffee'
            },
            id: 1,
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        };
        queueFeature(conf.poi, poi, t.end);
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
    tape('kansas america', (t) => {
        c.geocode('kansas america', { limit_verify:1 }, (err, res) => {
            t.ifError(err);
            t.equal(res.features[0].place_name, 'Kansas United States');
            t.equal(res.features[0].matching_text, undefined, 'feature.matching_text');
            t.equal(res.features[0].matching_place_name, 'Kansas America');
            t.end();
        });
    });
    tape('america', (t) => {
        c.geocode('america', { limit_verify:1 }, (err, res) => {
            t.ifError(err);
            t.equal(res.features[0].place_name, 'United States');
            t.equal(res.features[0].matching_text, 'America');
            t.equal(res.features[0].matching_place_name, 'America');
            t.end();
        });
    });
    tape('jayhawks', (t) => {
        c.geocode('jayhawks', { limit_verify:1 }, (err, res) => {
            t.ifError(err);
            t.equal(res.features[0].place_name, 'Kansas United States');
            t.equal(res.features[0].matching_text, 'Jayhawks');
            t.equal(res.features[0].matching_place_name, 'Jayhawks United States');
            t.end();
        });
    });
    tape('CB Cafe, Jayhawks - poi synonym and place synonym', (t) => {
        c.geocode('CB cafe, Jayhawks', { limit_verify: 1 }, (err, res) => {
            t.ifError(err, 'No errors');
            t.equal(res.features[0].place_name, 'Cool Beans, Kansas, United States', 'Place name should be the primary poi name and primary context name');
            t.equal(res.features[0].matching_text, 'CB cafe', 'matching_text should be the matching poi synonym.');
            t.equal(res.features[0].matching_place_name, 'CB cafe, Jayhawks, United States', 'matching_place_name should be the poi name and matching context');
            t.end();
        });
    });
})();

(() => {
    const conf = {
        address: new mem({ maxzoom: 6, geocoder_address: 1, geocoder_format: '{address._number} {address._name}' }, () => {})
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
})();

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
