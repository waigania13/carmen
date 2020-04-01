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
    const q = queue();
    for (const index of [conf.country_wv_us, conf.country_wv_cn]) {
        q.defer((cb) => {
            queueFeature(index, japan, cb);
        });
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
    const q = queue();
    for (const index of [conf.region_wv_us, conf.region_wv_cn]) {
        q.defer((cb) => {
            queueFeature(index, beijing, cb);
        });
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
    const q = queue(1);
    for (let i = 0; i < where.length; i++) {
        q.defer((i, instance, cb) => {
            const feature = JSON.parse(JSON.stringify(starbucks));
            feature.id = feature.id + i;
            feature.properties['carmen:center'] = instance.center;
            feature.geometry.coordinates = instance.center;
            feature.properties['carmen:geocoder_stack'] = instance.stack;
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

tape('geocode hong kong with worldview=us and no worldview', (t) => {
    const q = queue();
    for (const opts of [{ worldview: 'us' }, {}]) {
        q.defer((opts, cb) => c.geocode('hong kong', opts, cb), opts);
    }
    q.awaitAll((err, reses) => {
        t.deepEquals(reses[0], reses[1], 'no worldview and worldview=us produce same results');
        const res = reses[0];
        t.equals(res.features.length, 1, 'got back one result');
        t.equals(res.features[0].place_name, 'Hong Kong', 'no china in context');
        t.end();
    });
});

tape('geocode hong kong with worldview=cn', (t) => {
    c.geocode('hong kong', { worldview: 'cn' }, (err, res) => {
        t.equals(res.features.length, 1, 'got back one result');
        t.equals(res.features[0].place_name, 'Hong Kong, China', 'china in context');
        t.end();
    });
});

tape('geocode hong kong china with worldview=us and no worldview', (t) => {
    const q = queue();
    for (const opts of [{ worldview: 'us' }, {}]) {
        q.defer((opts, cb) => c.geocode('hong kong china', opts, cb), opts);
    }
    q.awaitAll((err, reses) => {
        t.deepEquals(reses[0], reses[1], 'no worldview and worldview=us produce same results');
        // only look at full-relevance results so we don't get stand-alone "china"
        const features = reses[0].features.filter((feature) => feature.relevance === 1);
        t.equals(features.length, 0, 'got back no full-relevance results');
        t.end();
    });
});

tape('geocode hong kong china with worldview=cn', (t) => {
    c.geocode('hong kong china', { worldview: 'cn' }, (err, res) => {
        const features = res.features.filter((feature) => feature.relevance === 1);
        t.equals(features.length, 1, 'got back one result');
        t.equals(features[0].place_name, 'Hong Kong, China', 'china in context');
        t.end();
    });
});

tape('geocode hong kong with country=cn, worldview=us and no worldview', (t) => {
    const q = queue();
    for (const opts of [{ worldview: 'us', stacks: ['cn'] }, { stacks: ['cn'] }]) {
        q.defer((opts, cb) => c.geocode('hong kong', opts, cb), opts);
    }
    q.awaitAll((err, reses) => {
        t.deepEquals(reses[0], reses[1], 'no worldview and worldview=us produce same results');
        t.equals(reses[0].features.length, 0, 'got back no full-relevance results');
        t.end();
    });
});

tape('geocode hong kong with country=cn, worldview=cn', (t) => {
    c.geocode('hong kong', { worldview: 'cn', stacks: ['cn'] }, (err, res) => {
        t.equals(res.features.length, 1, 'got back one result');
        t.equals(res.features[0].place_name, 'Hong Kong, China', 'china in context');
        t.end();
    });
});

tape('geocode beijing with worldview=us,cn, and no worldview', (t) => {
    const q = queue();
    for (const opts of [{ worldview: 'us' }, { worldview: 'cn' }, {}]) {
        q.defer((opts, cb) => c.geocode('beijing', opts, cb), opts);
    }
    q.awaitAll((err, reses) => {
        t.deepEquals(reses[0], reses[2], 'no worldview and worldview=us produce same results');
        for (const res of reses) {
            t.equals(res.features.length, 1, 'got back one result');
            t.equals(res.features[0].place_name, 'Beijing, China', 'china in context');
        }
        t.end();
    });
});

tape('geocode starbucks with worldview=us,cn, and no worldview', (t) => {
    const q = queue();
    for (const opts of [{ worldview: 'us' }, { worldview: 'cn' }, {}]) {
        q.defer((opts, cb) => c.geocode('starbucks', opts, cb), opts);
    }
    q.awaitAll((err, reses) => {
        t.deepEquals(reses[0], reses[2], 'no worldview and worldview=us produce same results');
        for (const res of reses) {
            const features = res.features.filter((feature) => feature.relevance === 1);
            t.equals(features.length, 3, 'got back three result');
            t.assert(features[0].place_name.match(/^Starbucks, .+/), 'everything is a starbucks');
        }
        t.end();
    });
});

tape('geocode starbucks china with worldview=us and no worldview', (t) => {
    const q = queue();
    for (const opts of [{ worldview: 'us' }, {}]) {
        q.defer((opts, cb) => c.geocode('starbucks china', opts, cb), opts);
    }
    q.awaitAll((err, reses) => {
        t.deepEquals(reses[0], reses[1], 'no worldview and worldview=us produce same results');
        // only look at full-relevance results so we don't get stand-alone "china"
        const features = reses[0].features.filter((feature) => feature.relevance === 1);
        t.equals(features.length, 1, 'got back one results (beijing only)');
        t.equals(features[0].place_name, 'Starbucks, Beijing, China', 'only result is in Beijing');
        t.end();
    });
});

tape('geocode starbucks china with worldview=cn', (t) => {
    c.geocode('starbucks china', { worldview: 'cn' }, (err, res) => {
        const features = res.features.filter((feature) => feature.relevance === 1);
        t.equals(features.length, 2, 'got back two results (one in beijing and one in hk)');
        for (const feature of features) {
            t.assert(feature.place_name.match(/China/), 'china in context');
        }
        t.end();
    });
});

tape('geocode starbucks with country=cn, worldview=us and no worldview', (t) => {
    const q = queue();
    for (const opts of [{ worldview: 'us', stacks: ['cn'] }, { stacks: ['cn'] }]) {
        q.defer((opts, cb) => c.geocode('starbucks china', opts, cb), opts);
    }
    q.awaitAll((err, reses) => {
        t.deepEquals(reses[0], reses[1], 'no worldview and worldview=us produce same results');
        // only look at full-relevance results so we don't get stand-alone "china"
        const features = reses[0].features.filter((feature) => feature.relevance === 1);
        t.equals(features.length, 1, 'got back one results (beijing only)');
        t.equals(features[0].place_name, 'Starbucks, Beijing, China', 'only result is in Beijing');
        t.end();
    });
});

tape('geocode starbucks with country=cn, worldview=cn', (t) => {
    c.geocode('starbucks', { worldview: 'cn', stacks: ['cn'] }, (err, res) => {
        const features = res.features.filter((feature) => feature.relevance === 1);
        t.equals(features.length, 2, 'got back two results (one in beijing and one in hk)');
        for (const feature of features) {
            t.assert(feature.place_name.match(/China/), 'china in context');
        }
        t.end();
    });
});

tape('reverse geocode hong kong centerpoint with worldview=us and no worldview', (t) => {
    const q = queue();
    for (const opts of [{ worldview: 'us', types: ['region'] }, { types: ['region'] }]) {
        q.defer((opts, cb) => c.geocode('120,25', opts, cb), opts);
    }
    q.awaitAll((err, reses) => {
        t.deepEquals(reses[0], reses[1], 'no worldview and worldview=us produce same results');
        const res = reses[0];
        t.equals(res.features.length, 1, 'got back one result');
        t.equals(res.features[0].place_name, 'Hong Kong', 'no china in context');
        t.end();
    });
});

tape('reverse geocode hong kong centerpoint with worldview=cn', (t) => {
    c.geocode('120,25', { worldview: 'cn', types: ['region'] }, (err, res) => {
        t.equals(res.features.length, 1, 'got back one result');
        t.equals(res.features[0].place_name, 'Hong Kong, China', 'china in context');
        t.end();
    });
});

tape('worldview query error', (t) => {
    c.geocode('china', { worldview: 'in' }, (err, results) => {
        t.assert(err);
        t.assert(err.toString().match(/Worldview must be/i));
        t.end();
    });
});

tape('misconfigured worldview index error', (t) => {
    const bad_conf = {
        country_wv_us: new mem({ geocoder_name: 'country', maxzoom: 6, geocoder_stack: ['cn', 'hk', 'jp'], geocoder_worldview: 'us' }, () => {}),
    };

    t.throws(() => new Carmen(bad_conf, { worldviews: ['cn'] }), 'must use a configured worldview');
    t.end();
});

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
