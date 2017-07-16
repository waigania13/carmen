const tape = require('tape');
const Carmen = require('..');
const mem = require('../lib/api-mem');
const context = require('../lib/context');
const queue = require('d3-queue').queue;
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;


(() => {
    const conf = {
        place: new mem({ maxzoom: 6, geocoder_languages: ['en','ko'] }, () => {}),
        neighborhood: new mem({ maxzoom: 6, geocoder_languages: [] }, () => {}),
    };
    const c = new Carmen(conf);

    tape('index San Francisco CA', (t) => {
        queueFeature(conf.place, {
            type: 'Feature',
            id: 1,
            properties: {
                'carmen:text': 'San Francisco',
                'carmen:text_en': 'San Francisco',
                'carmen:text_ko': '샌프란시스코',
                'carmen:score': 10
            },
            geometry: {
                type: 'Point',
                coordinates: [1,1]
            }
        }, t.end);
    });
    tape('index San Francisco VE', (t) => {
        queueFeature(conf.place, {
            type: 'Feature',
            id: 2,
            properties: {
                'carmen:text': 'San Francisco',
                'carmen:text_es': 'San Francisco',
                'carmen:score': 5
            },
            geometry: {
                type: 'Point',
                coordinates: [80,-10]
            }
        }, t.end);
    });
    tape('index San Francisco (neighborhood)', (t) => {
        queueFeature(conf.neighborhood, {
            type: 'Feature',
            id: 3,
            properties: {
                'carmen:text': 'San Francisco',
                'carmen:score': 0
            },
            geometry: {
                type: 'Point',
                coordinates: [100,-20]
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

    tape('query: San Francisco', (t) => {
        c.geocode('San Francisco', {}, (err, res) => {
            t.equal('place.1', res.features[0].id, 'Finds SF, CA');
            t.ifError(err);
            t.end();
        });
    });

    tape('query: San Francisco, language=en', (t) => {
        c.geocode('San Francisco', { language: 'en' }, (err, res) => {
            t.equal('place.1', res.features[0].id, 'Finds SF, CA');
            t.ifError(err);
            t.end();
        });
    });

    tape('query: San Francisco, language=ko', (t) => {
        c.geocode('San Francisco', { language: 'ko' }, (err, res) => {
            console.warn(res.features[0]);
            t.equal('place.1', res.features[0].id, 'Finds SF, CA');
            t.equal('place.2', res.features[1].id, 'Finds SF, VE');
            t.ifError(err);
            t.end();
        });
    });

    tape('teardown', (t) => {
        context.getTile.cache.reset();
        t.end();
    });
})();
