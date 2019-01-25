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
                'carmen:text': '9th Street Northwest',
                'carmen:center': [0,0],
                'carmen:addressnumber': [500]
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,0]]
            }
        };
        queueFeature(conf.address, address, t.end);
    });

    tape('index address', (t) => {
        const address = {
            id:2,
            properties: {
                'carmen:text': '9th Street Northwest',
                'carmen:center': [0,0],
                'carmen:intersections': ['F Street Northwest', 'Highway Number 2']
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,2]]
            }
        };
        queueFeature(conf.address, address, t.end);
    });

    tape('index address', (t) => {
        const address = {
            id:3,
            properties: {
                'carmen:text': 'F Street Northwest',
                'carmen:center': [0,0],
                'carmen:addressnumber': [500]
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,0]]
            }
        };
        queueFeature(conf.address, address, t.end);
    });

    tape('index address', (t) => {
        const address = {
            id:4,
            properties: {
                'carmen:text': 'F Street Northwest',
                'carmen:center': [0,0],
                'carmen:intersections': ['9th Street Northwest']
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,0]]
            }
        };
        queueFeature(conf.address, address, t.end);
    });

    tape('index address', (t) => {
        const address = {
            id:5,
            properties: {
                'carmen:text': 'X place and Y place',
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

    tape('index address', (t) => {
        const address = {
            id:6,
            properties: {
                'carmen:text': 'F Street Northwest',
                'carmen:center': [0,0],
                'carmen:intersections': ['9th Street Northwest', 'Frosted Flakes Avenue']
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,2]]
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
            t.equals(res.features[0].place_name, '9th Street Northwest', 'returns street before intersection point');
            t.end();
        });
    });

    tape('Searching for the intersections only after and is typed - F street northwest', (t) => {
        c.geocode('F street northwest', {}, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'F Street Northwest', 'returns street before intersection point');
            t.end();
        });
    });

    tape('Searching for 500 9th street northwest', (t) => {
        c.geocode('500 9th street northwest', {}, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '500 9th Street Northwest', '500 9th Street Northwest');
            t.end();
        });
    });


    tape('Searching for the intersection - F street northwest and 9th street northwest', (t) => {
        c.geocode('F Street Northwest and 9th Street Northwest', {}, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'F Street Northwest and 9th Street Northwest', 'F Street Northwest and 9th Street Northwest');
            t.end();
        });
    });

    tape('Searching for the intersection - 9th street northwest and F street northwest', (t) => {
        c.geocode('9th Street Northwest and f street northwest', {}, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '9th Street Northwest and F Street Northwest', '9th street northwest and F street northwest');
            t.end();
        });
    });

    tape('X place and Y place', (t) => {
        c.geocode('X place and Y place', {}, (err, res) => {
            t.equals(res.features[0].place_name, 'X place and Y place', 'X place and Y place');
            t.ifError(err);
            t.end();
        });
    });

    tape('Searching for the intersection - 9th st nw & F st nw', (t) => {
        c.geocode('9th st nw and F st nw', {}, (err, res) => {
            t.equals(res.features[0].place_name, '9th Street Northwest and F Street Northwest', '9th st nw & F st nw');
            t.end();
        });
    });

    tape('Searching for the intersection - synonyms', (t) => {
        c.geocode('Highway Number 2 and 9th Street Northwest', {}, (err, res) => {
            t.equals(res.features[0].place_name, 'Highway Number 2 and 9th Street Northwest', 'highway number 2 and 9th street northwest');
            t.end();
        });
    });

    tape('Searching for the intersection - synonyms', (t) => {
        c.geocode('Frosted Flakes Avenue and F Street Northwest', {}, (err, res) => {
            t.equals(res.features[0].place_name, 'Frosted Flakes Avenue and F Street Northwest', 'frosted flakes avenue and F street northwest');
            t.end();
        });
    });
})();

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
