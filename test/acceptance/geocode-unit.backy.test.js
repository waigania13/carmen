// Unit tests for backy stacking of features ("lessingstrasse 50825 koln vs lessingstrasse koln 50825")

'use strict';
const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const queue = require('d3-queue').queue;
const { queueFeature, buildQueued } = require('../../lib/indexer/addfeature');

const conf = {
    postcode: new mem(null, () => {}),
    city: new mem(null, () => {}),
    street: new mem({ maxzoom:6, geocoder_address:1 }, () => {})
};
const c = new Carmen(conf);
tape('index postcode', (t) => {
    const doc = {
        id:1,
        properties: {
            'carmen:text': '50825',
            'carmen:zxy': ['6/32/32','6/33/32'],
            'carmen:center': [0,0]
        }
    };
    queueFeature(conf.postcode, doc, t.end);
});
tape('index city', (t) => {
    const city = {
        id:1,
        properties: {
            'carmen:text':'koln',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    queueFeature(conf.city, city, t.end);
});
tape('index street 1', (t) => {
    const street = {
        id:1,
        properties: {
            'carmen:text': 'lessingstrasse',
            'carmen:zxy': ['6/32/32'],
            'carmen:center': [0,0]
        }
    };
    queueFeature(conf.street, street, t.end);
});
tape('index street 2', (t) => {
    const street = {
        id:2,
        properties: {
            'carmen:text': 'lessingstrasse',
            'carmen:zxy': ['6/33/32'],
            'carmen:center': [360 / 64 + 0.001,0]
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
tape('lessingstrasse koln 50825', (t) => {
    c.geocode('lessingstrasse koln 50825', { limit_verify:1 }, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'lessingstrasse, koln, 50825');
        t.deepEqual(res.features[0].id, 'street.1');
        t.assert(1 - res.features[0].relevance < .01);
        t.end();
    });
});

// @FIXME limit
// tape('lessingstrasse 50825 koln', (t) => {
//     c.geocode('lessingstrasse 50825 koln', { limit_verify:1 }, (err, res) => {
//         t.ifError(err);
//         t.deepEqual(res.features[0].place_name, 'lessingstrasse, koln, 50825');
//         t.deepEqual(res.features[0].id, 'street.1');
//         t.deepEqual(res.features[0].relevance, 0.996667);
//         t.end();
//     });
// });

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
