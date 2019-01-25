'use strict';

const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const queue = require('d3-queue').queue;
const { queueFeature, buildQueued } = require('../../lib/indexer/addfeature');


(() => {
    const conf = {
        address: new mem({
            maxzoom: 14,
            geocoder_address: 1,
            geocoder_tokens: { st: 'street', nw: 'northwest'}
        }, () => {})
    };

    const c = new Carmen(conf);

    tape('index address', (t) => {
        const address = {
            id:1,
            properties: {
                'carmen:text': '9th street northwest',
                'carmen:center': [0,0],
                'carmen:addressnumber': ['f Street northwest', 500, 't street northwest']
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,0], [0,1], [0,2]]
            }
        };
        queueFeature(conf.address, address, t.end);
    });

    tape('index address', (t) => {
        const address = {
            id:2,
            properties: {
                'carmen:text': 'F street northwest',
                'carmen:center': [0,0],
                'carmen:addressnumber': ['main street northwest', 500, '10th street northwest']
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,0], [0,1], [0,2]]
            }
        };
        queueFeature(conf.address, address, t.end);
    });

    tape('index address', (t) => {
        const address = {
            id:3,
            properties: {
                'carmen:text': 'something and something',
                'carmen:center': [0,0],
                'carmen:addressnumber': []
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,0]]
            }
        };
        queueFeature(conf.address, address, t.end);
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

    tape('Searching for the street - 9th street northwest', (t) => {
        c.geocode('9th street northwest', {}, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '9th street northwest', 'returns street before intersection point');
            t.end();
        });
    });

    tape('Searching for the intersections only after and is typed - F street northwest', (t) => {
        c.geocode('F street northwest', {}, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'F street northwest', 'returns street before intersection point');
            t.end();
        });
    });

    tape('Searching for the intersections only after and is typed - F street northwest', (t) => {
        c.geocode('500 9th street northwest', {}, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '500 9th street northwest', '500 9th Street Northwest');
            t.end();
        });
    });


    tape('Searching for the intersection - F street northwest and 9th street northwest', (t) => {
        c.geocode('F street northwest and 9th street northwest', {}, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'f street northwest and 9th street northwest', 'F street northwest and 9th street northwest');
            t.end();
        });
    });

    tape('Searching for the intersection - 9th street northwest and F street northwest', (t) => {
        c.geocode('9th street northwest', {}, (err, res) => {
            t.ifError(err);
            console.log(res);
            t.end();
        });
    });

    tape('something and something', (t) => {
        c.geocode('something and something', {}, (err, res) => {
            t.ifError(err);
            t.end();
        });
    });
    //
    // tape('Searching for the intersection - 9th st nw & F st nw', (t) => {
    //     c.geocode('9th street northwest & F street northwest', {}, (err, res) => {
    //         t.deepEquals(res.query, [ '9th', 'street', 'northwest', 'f', 'street', 'northwest' ], 'does not convert & => and');
    //         t.end();
    //     });
    // });
})();

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});

// right now - for every intersection we'll have different features
// one option is nesting intersection data in feature
// look at the way we handle house numbers
