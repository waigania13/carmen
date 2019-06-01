// Confirm that translations are not included in the autocomplete index

'use strict';
const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const queue = require('d3-queue').queue;
const { queueFeature, buildQueued } = require('../../lib/indexer/addfeature');


let conf;
let c;
tape('setup', (t) => {
    conf = { region: new mem({ maxzoom: 6, geocoder_languages: ['en', 'hu'] }, () => {}) };
    c = new Carmen(conf);
    t.end();
});

tape('index first region', (t) => {
    queueFeature(conf.region, {
        id:1,
        properties: {
            'carmen:text':'South Carolina',
            'carmen:text_en': 'South Carolina',
            'carmen:text_hu':'Dél-Karolina',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    }, t.end);
});
tape('index second region', (t) => {
    queueFeature(conf.region, {
        id:2,
        properties: {
            'carmen:text':'Delaware',
            'carmen:text_en':'Delaware',
            'carmen:text_hu':'Delaware',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
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

tape('de', (t) => {
    c.geocode('de', {}, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features.length, 2, '2 results');
        t.deepEqual(res.features[0].place_name, 'Delaware', 'found: Delaware');
        t.deepEqual(res.features[0].id, 'region.2');

        t.deepEqual(res.features[1].place_name, 'South Carolina', 'found: South Carolina (in second place)');
        t.deepEqual(res.features[1].id, 'region.1');
        t.ok(res.features[0].relevance - res.features[1].relevance > 0, 'South Carolina has a relevance penalty vs. Delaware');

        t.end();
    });
});
tape('de (language: en)', (t) => {
    c.geocode('de', { language: 'en' }, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features.length, 2, '2 results');
        t.deepEqual(res.features[0].place_name, 'Delaware', 'found: Delaware');
        t.deepEqual(res.features[0].id, 'region.2');

        t.deepEqual(res.features[1].place_name, 'South Carolina', 'found: South Carolina (in second place)');
        t.deepEqual(res.features[1].id, 'region.1');
        t.ok(res.features[0].relevance - res.features[1].relevance > 0, 'South Carolina has a relevance penalty vs. Delaware');

        t.end();
    });
});
tape('de (language: hu)', (t) => {
    c.geocode('de', { language: 'hu' }, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features.length, 2, '2 results');
        t.deepEqual(res.features[0].place_name, 'Dél-Karolina', 'found: Dél-Karolina (South Carolina\'s Hungarian name)');
        t.deepEqual(res.features[0].id, 'region.1');

        t.deepEqual(res.features[1].place_name, 'Delaware', 'found: Delaware (in second place)');
        t.deepEqual(res.features[1].id, 'region.2');

        t.ok(res.features[0].relevance - res.features[1].relevance < .1, 'Delaware has no relevance penalty vs. South Carolina/Dél-Karolina because Delaware is also called "Delaware" in Hungarian');

        t.end();
    });
});
tape('de (language: hu-HU)', (t) => {
    c.geocode('de', { language: 'hu-HU' }, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features.length, 2, '2 results');
        t.deepEqual(res.features[0].place_name, 'Dél-Karolina', 'found: Dél-Karolina (South Carolina\'s Hungarian name)');
        t.deepEqual(res.features[0].id, 'region.1');

        t.deepEqual(res.features[1].place_name, 'Delaware', 'found: Delaware (in second place)');
        t.deepEqual(res.features[1].id, 'region.2');

        t.ok(res.features[0].relevance - res.features[1].relevance < .1, 'Delaware has no relevance penalty vs. South Carolina/Dél-Karolina because Delaware is also called "Delaware" in Hungarian');

        t.end();
    });
});
tape('delaware', (t) => {
    c.geocode('delaware', {}, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features.length, 1, '1 result');
        t.deepEqual(res.features[0].place_name, 'Delaware', 'found: Delaware');
        t.deepEqual(res.features[0].id, 'region.2');
        t.end();
    });
});
tape('sou', (t) => {
    c.geocode('sou', {}, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features.length, 1, '1 result');
        t.deepEqual(res.features[0].place_name, 'South Carolina', 'found: South Carolina');
        t.deepEqual(res.features[0].id, 'region.1');
        t.end();
    });
});
tape('south carolina', (t) => {
    c.geocode('south carolina', {}, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features.length, 1, '1 result');
        t.deepEqual(res.features[0].place_name, 'South Carolina', 'found: South Carolina');
        t.deepEqual(res.features[0].id, 'region.1');
        t.end();
    });
});
tape('del karolina', (t) => {
    c.geocode('del karolina', {}, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features.length, 1, '1 result');
        t.deepEqual(res.features[0].place_name, 'South Carolina', 'found: South Carolina');
        t.deepEqual(res.features[0].id, 'region.1');
        t.end();
    });
});

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});

