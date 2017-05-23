const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

const conf = {
    // TODO: possibly handle `universal` differently, so we don't have to think of it as a language
    region: new mem({ maxzoom: 6, geocoder_name: 'poi', geocoder_languages: ['en', 'universal'] }, () => {})
};
const c = new Carmen(conf);

tape('index Hron', (t) => {
    let region = {
        id:1,
        properties: {
            'carmen:text':'Hron,Hronlandia',
            'carmen:text_en':'Hron',
            'carmen:text_universal':'HO',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    queueFeature(conf.region, region, t.end);
});

tape('index Holdout', (t) => {
    let region = {
        id:2,
        properties: {
            'carmen:text':'Holdout',
            'carmen:text_en':'Holdout',
            'carmen:text_universal':'HT',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    queueFeature(conf.region, region, t.end);
});

tape('index test', (t) => {
    let region = {
        id:3,
        properties: {
            'carmen:text':'test',
            // 'carmen:text_universal':'test',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    queueFeature(conf.region, region, t.end);
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

tape('Find features using default text', (t) => {
    c.geocode('Hron', {limit_verify: 1}, (err, res) => {
        t.ifError(err);
        t.equal(res.features[0].text, 'Hron', 'finds Hron');
        t.end();
    });
});

tape('Find feature using language code', (t) => {
    c.geocode('Holdout', {limit_verify: 1, language: 'en'}, (err, res) => {
        t.ifError(err);
        t.equal(res.features[0].text, 'Holdout', 'finds Holdout using a language code');
        t.end();
    });
});

tape('Find features using universal text', (t) => {
    c.geocode('HO', {}, (err, res) => {
        t.ifError(err);
        t.equal(res.features.length, 2, 'finds features using default text and universal text');
        t.end();
    });
});

tape('Finds and ranks features using universal text with language codes', (t) => {
    c.geocode('HO', {language: 'en'}, (err, res) => {
        t.ifError(err);
        t.equal(res.features.length, 2, 'finds both features even using a language code');
        t.equal(res.features[0].text, 'Hron', 'ranks complete match of universal text above autocompleted default text');
        t.end();
    });
});

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
