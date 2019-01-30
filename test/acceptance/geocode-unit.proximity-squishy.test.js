'use strict';
const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const queue = require('d3-queue').queue;
const { queueFeature, buildQueued } = require('../../lib/indexer/addfeature');

// identically-named features should reverse the gappy penalty and
// instead prioritize the highest-index feature
// but local feature should still return first with proximity enabled
const conf = {
    country: new mem({ maxzoom: 6, minscore: 0, maxscore: 1e6 }, () => {}),
    place: new mem({ maxzoom: 6, geocoder_inherit_score: true, minscore: 0, maxscore: 1e5 }, () => {}),
    poi: new mem({ maxzoom: 6, minscore: 0, maxscore: 1e4 }, () => {})
};

const c = new Carmen(conf);

tape('index country', (t) => {
    queueFeature(conf.country, {
        id: 1,
        properties: {
            'carmen:center': [45,45],
            'carmen:score': 600,
            'carmen:text':'georgia'
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [40,40],
                [40,50],
                [50,50],
                [50,40],
                [40,40],
            ]]
        }
    }, t.end);
});

tape('index place', (t) => {
    queueFeature(conf.place, {
        id: 1,
        properties: {
            'carmen:center': [45,45],
            'carmen:score': 500,
            'carmen:text':'georgia'
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [40,40],
                [40,50],
                [50,50],
                [50,40],
                [40,40],
            ]]
        }
    }, t.end);
});

tape('index poi', (t) => {
    queueFeature(conf.poi, {
        id: 1,
        properties: {
            'carmen:center': [0,0],
            'carmen:score': 1,
            'carmen:text': 'Georgia Cafe',
        },
        geometry: {
            type: 'Point',
            coordinates: [0,0]
        }
    }, t.end);
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

tape('find georgia', (t) => {
    c.geocode('georgia', { proximity: [0,0] }, (err, res) => {
        t.equal(res.features[0].id, 'poi.1', 'Georgia Cafe');
        t.equal(res.features[1].id, 'place.1', 'Georgia (place)');
        t.equal(res.features[2].id, 'country.1', 'Georgia (country)');
        t.end();
    });
});

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
