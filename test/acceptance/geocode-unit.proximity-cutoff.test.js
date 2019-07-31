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


tape('index places', (t) => {
    const docs = [];

    for (let i = 1980; i < 2080; i++) {
        docs.push({
            id: i,
            type: 'Feature',
            properties: {
                'carmen:text':'san francisco',
                'carmen:score': 4,
                'carmen:zxy':[`12/${i}/${i}`],
                'carmen:center':[0, 0]
            }
        });
    }

    // Add the closest feature to the proximity point but with a lower score,
    // so it will only make the cutoff is proximity is correctly set
    docs.push({
        id: 2080,
        type: 'Feature',
        properties: {
            'carmen:text':'san francisco',
            'carmen:score': 3,
            'carmen:zxy':['12/2080/2080'],
            'carmen:center':[0, 0]
        }
    });
    queueFeature(conf.place, docs, () => { buildQueued(conf.place, t.end); });
});

tape('query', (t) => {
    c.geocode('san', { debug: true, proximity: [3, -3] }, (err, res) => {
        t.equal(res.features[0].id, 'place.2080', 'The closest feature makes it past coalesce cutoffs and is the first result');
        t.end();
    });
});

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});



