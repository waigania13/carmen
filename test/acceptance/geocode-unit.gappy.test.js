'use strict';
// Unit tests for gappy stacking of features ("west st new york")

const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../../lib/indexer/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

// limit_verify 1 implies that the correct result must be the very top
// result prior to context verification. It means even with a long list
// of competing results the correct candidate is sorted to the top.

// limit_verify 2 implies that there is some ambiguity prior to context
// verification (e.g. new york (city) vs new york (province)) that is sorted
// into the correct order after context verification occurs.

const conf = {
    province: new mem(null, () => {}),
    city: new mem(null, () => {}),
    street: new mem({ maxzoom:6, geocoder_address:1 }, () => {})
};
const c = new Carmen(conf);
tape('index province', (t) => {
    const province = {
        id:1,
        properties: {
            'carmen:text':'new york, ny',
            'carmen:zxy':['6/32/32','6/34/32'],
            'carmen:center':[0,0]
        }
    };
    queueFeature(conf.province, province, t.end);
});
tape('index city 1', (t) => {
    const city = {
        id:1,
        properties: {
            'carmen:text':'new york, ny',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    queueFeature(conf.city, city, t.end);
});
tape('index city 2', (t) => {
    const city = {
        id:2,
        properties: {
            'carmen:text':'tonawanda',
            'carmen:zxy':['6/34/32'],
            'carmen:center':[14.0625, -2.8079929095776683]
        }
    };
    queueFeature(conf.city, city, t.end);
});
tape('index street 1', (t) => {
    const street = {
        id:1,
        properties: {
            'carmen:text':'west st',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    queueFeature(conf.street, street, t.end);
});
tape('index street 2', (t) => {
    const street = {
        id:2,
        properties: {
            'carmen:text':'west st',
            'carmen:zxy':['6/34/32'],
            'carmen:center':[14.0625, -2.8079929095776683]
        }
    };
    queueFeature(conf.street, street, t.end);
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
tape('west st, tonawanda, ny', (t) => {
    c.geocode('west st tonawanda ny', { limit_verify:1 }, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'west st, tonawanda, new york');
        t.end();
    });
});
tape('west st, new york, ny', (t) => {
    c.geocode('west st new york ny', { limit_verify:1 }, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'west st, new york, new york');
        t.end();
    });
});
tape('new york', (t) => {
    c.geocode('new york', { limit_verify:1 }, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'new york');
        t.deepEqual(res.features[0].id, 'province.1');
        t.end();
    });
});
tape('new york new york', (t) => {
    c.geocode('new york new york', { limit_verify:2 }, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'new york, new york');
        t.deepEqual(res.features[0].id, 'city.1');
        t.end();
    });
});
tape('ny ny', (t) => {
    c.geocode('ny ny', { limit_verify:2 }, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'new york, new york');
        t.deepEqual(res.features[0].id, 'city.1');
        t.end();
    });
});
tape('new york ny', (t) => {
    c.geocode('new york ny', { limit_verify:2 }, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'new york, new york');
        t.deepEqual(res.features[0].id, 'city.1');
        t.end();
    });
});

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
