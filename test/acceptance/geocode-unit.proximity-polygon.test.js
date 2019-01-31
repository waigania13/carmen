'use strict';
const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const addFeature = require('../../lib/indexer/addfeature');
const queueFeature = addFeature.queueFeature;
const buildQueued = addFeature.buildQueued;

const conf = {
    place: new mem({ maxzoom: 12, maxscore: 1670000 }, () => {})
};
const c = new Carmen(conf);
const tiles = [];
let tiles1 = [];
let tiles2 = [];
let tiles3 = [];
let tile;
for (let k = 2048; k < 2080; k++) {
    for (let l = 2048; l < 2080; l++) {
        tile = '12/' + k + '/' + l;
        tiles.push(tile);
    }
}
tiles1 = tiles.slice(0, 341);
tiles2 = tiles.slice(341,682);
tiles3 = tiles.slice(682);

tape('index place', (t) => {
    const docs = [];
    let place;

    place = {
        id:1,
        type: 'Feature',
        properties: {
            'carmen:text':'san francisco',
            'carmen:score': 8033,
            'carmen:zxy':tiles1,
            'carmen:center':[2, -1]
        }
    };
    docs.push(place);

    place = {
        id:2,
        type: 'Feature',
        properties: {
            'carmen:text':'san diego',
            'carmen:score': 7891,
            'carmen:zxy':tiles2,
            'carmen:center':[2, -1]
        }
    };
    docs.push(place);

    place = {
        id:3,
        type: 'Feature',
        properties: {
            'carmen:text':'san jose',
            'carmen:score': 3877,
            'carmen:zxy':tiles3,
            'carmen:center':[2, -1]
        }
    };
    docs.push(place);

    queueFeature(conf.place, docs, () => { buildQueued(conf.place, t.end); });
});

tape('query', (t) => {
    context.getTile.cache.reset();
    addFeature.resetLogs(conf);
    c.geocode('san', { debug: true, proximity: [3, -3] }, (err, res) => {
        t.equal(res.features.map((v) => v.id).join(', '), 'place.2, place.3, place.1', 'proximity boosts lower-scored place');
        t.equal(res.features[0].properties['carmen:score'] < res.features[2].properties['carmen:score'], true, 'place.3 has a lower score than place.2');
        t.equal(res.features[0].properties['carmen:distance'] < res.features[2].properties['carmen:distance'], true, 'place.3 is closer than place.2 to proximity point');
        t.equal(res.features[0].properties['carmen:scoredist'] > res.features[2].properties['carmen:scoredist'], true, 'place.3 has a higher scoredist than place.2');
        t.end();
    });
});

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
