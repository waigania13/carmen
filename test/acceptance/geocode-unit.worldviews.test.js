// Tests Windsor CT (city) vs Windsor Ct (street name)
// Windsor CT should win via stacky bonus.
'use strict';

const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const queue = require('d3-queue').queue;
const { queueFeature, buildQueued } = require('../../lib/indexer/addfeature');

const conf = {
    country_wv_us: new mem({ geocoder_name: 'country', maxzoom: 6, geocoder_stack: ['cn', 'hk', 'jp'], geocoder_worldview: 'us' }, () => {}),
    country_wv_cn: new mem({ geocoder_name: 'country', maxzoom: 6, geocoder_stack: ['cn', 'jp'], geocoder_worldview: 'cn' }, () => {}),
    region_wv_us: new mem({ geocoder_name: 'region', maxzoom: 6, geocoder_stack: ['cn', 'hk', 'jp'], geocoder_worldview: 'us' }, () => {}),
    region_wv_cn: new mem({ geocoder_name: 'region', maxzoom: 6, geocoder_stack: ['cn', 'jp'], geocoder_worldview: 'cn' }, () => {}),
    poi: new mem({ geocoder_name: 'poi', minscore: 0, maxscore: 500, maxzoom: 14, geocoder_stack: ['cn', 'hk', 'jp'] }, () => {}),
};

const c = new Carmen(conf, { worldviews: ['us', 'cn'] });
tape('index china as country for us', (t) => {
    // this is a rectangle with a square missing from the lower right corner
    // for hong kong
    queueFeature(conf.country_wv_us, {
        id: 1,
        properties: {
            'carmen:score': 25000,
            'carmen:text': 'China',
            'carmen:geocoder_stack': 'cn',
            'carmen:center': [97.5, 35]
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [70, 20],
                [115, 20],
                [115, 30],
                [125, 30],
                [125, 50],
                [70, 50],
                [70, 20]
            ]]
        }
    }, t.end);
});
tape('index honk kong as country for us', (t) => {
    // this is the missing corner from above: hong kong as a country
    // (but multityped as region and place)
    queueFeature(conf.country_wv_us, {
        id: 2,
        properties: {
            'carmen:score': 5000,
            'carmen:text': 'Hong Kong',
            'carmen:geocoder_stack': 'hk',
            'carmen:types': ['country', 'region', 'place'],
            'carmen:center': [120, 25]
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [115, 20],
                [125, 20],
                [125, 30],
                [115, 30],
                [115, 20]
            ]]
        }
    }, t.end);
});
tape('index china as country for china', (t) => {
    // this is a rectangle without the missing corner (so, includes "hong kong")
    queueFeature(conf.country_wv_cn, {
        id: 3,
        properties: {
            'carmen:score': 25000,
            'carmen:text': 'China',
            'carmen:geocoder_stack': 'cn',
            'carmen:center': [97.5, 35]
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [70, 20],
                [125, 20],
                [125, 50],
                [70, 50],
                [70, 20]
            ]]
        }
    }, t.end);
});
tape('index japan as country for both', (t) => {
    // this is a rectangle that overlaps with nothing and is in both worldviews
    const japan = {
        id: 4,
        properties: {
            'carmen:score': 25000,
            'carmen:text': 'Japan',
            'carmen:geocoder_stack': 'jp',
            'carmen:center': [137.5, 37.5]
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [130, 30],
                [145, 30],
                [145, 45],
                [130, 45],
                [130, 30]
            ]]
        }
    };
    let q = queue();
    for (const index of [conf.country_wv_us, conf.country_wv_cn]) {
        q.defer((cb) => {
            queueFeature(index, japan, cb);
        })
    }
    q.awaitAll(t.end);
});
tape('index honk kong as region for china', (t) => {
    // this is a feature that's the same as the above HK except for stack/types/id
    queueFeature(conf.region_wv_cn, {
        id: 52,
        properties: {
            'carmen:score': 5000,
            'carmen:text': 'Hong Kong',
            'carmen:geocoder_stack': 'cn',
            'carmen:types': ['region', 'place'],
            'carmen:center': [120, 25]
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [115, 20],
                [125, 20],
                [125, 30],
                [115, 30],
                [115, 20]
            ]]
        }
    }, t.end);
});
tape('index beijing as region for both', (t) => {
    // this is a square that overlaps with both chinas
    const beijing = {
        id: 53,
        properties: {
            'carmen:score': 5000,
            'carmen:text': 'Beijing',
            'carmen:geocoder_stack': 'cn',
            'carmen:types': ['region', 'place'],
            'carmen:center': [117.5, 42.5]
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [115, 40],
                [120, 40],
                [120, 45],
                [115, 45],
                [115, 40]
            ]]
        }
    };
    let q = queue();
    for (const index of [conf.region_wv_us, conf.region_wv_cn]) {
        q.defer((cb) => {
            queueFeature(index, beijing, cb);
        })
    }
    q.awaitAll(t.end);
});
tape('index three Starbucks POIs in shared POI layer', (t) => {
    // this is a square that overlaps with both chinas
    const starbucks = {
        id: 100,
        properties: {
            'carmen:score': 10,
            'carmen:text': 'Starbucks'
        },
        geometry: {
            type: 'Point'
        }
    };
    const where = [
        { center: [120, 25], stack: 'hk' },
        { center: [117, 42], stack: 'cn' },
        { center: [140, 40], stack: 'jp' }
    ];
    let q = queue(1);
    for (let i = 0; i < where.length; i++) {
        q.defer((i, instance, cb) => {
            const feature = JSON.parse(JSON.stringify(starbucks));
            feature.id = feature.id + i;
            feature.properties['carmen:center'] = instance.center;
            feature.geometry.coordinates = instance.center;
            feature.properties['carmen:geocoder_stack'] = instance.stack;
            console.log(feature);
            queueFeature(conf.poi, feature, cb);
        }, i, where[i]);
    }
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

// invalid options.types type
tape('geocode hong kong', (t) => {
    c.geocode('starbucks', {worldview: 'cn'}, (err, res) => {
        console.log(JSON.stringify(res, null, 4));
        t.end();
    });
});

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
