const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

// Test that geocoder returns index names for context
(() => {
    const conf = {
        poi: new mem({ maxzoom:6 }, () => {}),
    };
    const c = new Carmen(conf);
    tape('index poi', (t) => {
        let poi = {
            id:1,
            properties: {
                'carmen:text': 'Ohio State University,Ohio State,OSU,The Ohio State University',
                'carmen:text_en': 'Ohio State University,Ohio State,OSU,The Ohio State University',
                'carmen:center': [0,0],
                'carmen:zxy':['6/32/32']
            },
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        };
        queueFeature(conf.poi, poi, t.end);
    });
    tape('index poi1', (t) => {
        let poi1 = {
            id:2,
            properties: {
                'carmen:text': 'osu',
                'carmen:text_en': null,
                'carmen:center': [0,1],
                'carmen:zxy':['6/32/32']
            },
            geometry: {
                type: 'Point',
                coordinates: [1,0]
            }
        };
        queueFeature(conf.poi, poi1, t.end);
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

    tape('Search for a poi', (t) => {
        c.geocode('OSU', { limit_verify: 1, indexes: true, language: 'en'}, (err, res) => {
            console.log('res', JSON.stringify(res, null, 4));
            t.ifError(err);
            t.deepEquals(res.indexes, [ 'poi']);
            t.end();
        });
    });
})();

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
