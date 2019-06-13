'use strict';
// Test to make sure identified house numbers in Japan are properly passed along
// rather than being misidentified in verifymatch

const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../../lib/indexer/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

const tokens = {
    '(１０|10)丁目': { regex: true, spanBoundaries: 2, text: '十丁目' },
    '[１1]丁目': { regex: true, spanBoundaries: 2, text: '一丁目' },
    '[２2]丁目': { regex: true, spanBoundaries: 2, text: '二丁目' },
    '[３3]丁目': { regex: true, spanBoundaries: 2, text: '三丁目' },
    '[４4]丁目': { regex: true, spanBoundaries: 2, text: '四丁目' },
    '[５5]丁目': { regex: true, spanBoundaries: 2, text: '五丁目' },
    '[６6]丁目': { regex: true, spanBoundaries: 2, text: '六丁目' },
    '[７7]丁目': { regex: true, spanBoundaries: 2, text: '七丁目' },
    '[８8]丁目': { regex: true, spanBoundaries: 2, text: '八丁目' },
    '[９9]丁目': { regex: true, spanBoundaries: 2, text: '九丁目' }
};

const conf = {
    place: new mem({ maxzoom: 6, geocoder_tokens: tokens }, () => {}),
    address: new mem({
        maxzoom: 6,
        geocoder_address: 1,
        geocoder_name:'address',
        geocoder_tokens: tokens,
        geocoder_format: '{country._name}, {region._name}{place._name}{locality._name}{address._name}{address._number}'
    }, () => {})
};
const c = new Carmen(conf);
tape('index address', (t) => {
    const address = {
        'type': 'Feature',
        'id': 12345,
        'geometry': {
            'type': 'MultiPoint',
            'coordinates': [
                [130.001, 33.001],
                [130.002, 33.002],
                [130.003, 33.003],
                [130.004, 33.004]
            ]
        },
        'properties': {
            'carmen:score': 1,
            'carmen:geocoder_stack': 'jp',
            'carmen:addressnumber': ['6', '1', '16', '26'],
            'carmen:center': [130.002, 33.002],
            'carmen:text': '弥生が丘八丁目'
        }
    };
    queueFeature(conf.address, address, t.end);
});
tape('index address', (t) => {
    const place = {
        id: 2,
        properties: {
            'carmen:text': '鳥栖市',
            'carmen:center': [130, 33]
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [128, 31],
                [132, 31],
                [132, 35],
                [128, 35],
                [128, 31]
            ]]
        }
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

tape('full address', (t) => {
    c.geocode('鳥栖市弥生が丘8丁目1', {}, (err, res) => {
        t.ifError(err);
        t.ok(res.features.length);
        t.equal(res.features[0].id, 'address.12345', 'found correct feature');
        t.equal(res.features[0].address, '1', 'interpreted 1 as address number');
        t.end();
    });
});

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
