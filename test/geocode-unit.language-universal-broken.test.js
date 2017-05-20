const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

const conf = {
    poi: new mem({ maxzoom: 6, geocoder_name: 'poi', geocoder_languages: ['en', 'es'] }, () => {})
};
const c = new Carmen(conf);

tape('index BIA', (t) => {
    let poi = {
        id:1,
        properties: {
            'carmen:text':'Borolia International Airport,BAI',
            'carmen:text_en':'Borolia International Airport',
            'carmen:text_es':'Borolia Aeropuerto Internacional',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    queueFeature(conf.poi, poi, t.end);
});

tape('index Bai', (t) => {
    let poi = {
        id:2,
        properties: {
            'carmen:text':'A Totally Different Thing, Inc.',
            'carmen:text_en':'A Totally Different Thing, Inc.',
            'carmen:text_es':'Bai',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
        queueFeature(conf.poi, poi, t.end);
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
    c.geocode('Borolia', {limit_verify: 1}, (err, res) => {
        t.ifError(err);
        t.equal(res.features[0].text, 'Borolia International Airport', 'finds Borolia');
        t.end();
    });
});

tape('Find feature using synonym text', (t) => {
    c.geocode('BAI', {}, (err, res) => {
        t.ifError(err);
        t.equal(res.features[0].text, 'Borolia International Airport', 'finds synonyms');
        t.end();
    });
});

tape('Fail to find synonyms with language code', (t) => {
    c.geocode('BAI', { language: 'es' }, (err, res) => {
        t.ifError(err);
        t.equal(res.features[0].text, 'Bai', 'prefers Bai over airport synonym');
        t.end();
    });
});

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
