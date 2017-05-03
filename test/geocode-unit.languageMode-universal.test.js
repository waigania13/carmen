var tape = require('tape');
var Carmen = require('..');
var mem = require('../lib/api-mem');
var context = require('../lib/context');
var queue = require('d3-queue').queue;
var addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

(function() {
    var conf = {
        country: new mem({ maxzoom: 6, geocoder_languages: ['es'] }, function() {}),
        postcode: new mem({ maxzoom:6, geocoder_universal_text: true }, function() {})
    };
    var c = new Carmen(conf);

    tape('index country', (t) => {
        queueFeature(conf.country, {
            type: 'Feature',
            id: 1,
            properties: {
                'carmen:center': [1,1],
                'carmen:text_es': 'Estados Unidos',
                'carmen:text': 'United States'
            },
            geometry: {
                type: 'Point',
                coordinates: [1,1]
            }
        }, t.end);
    });

    tape('index postcode', (t) => {
        queueFeature(conf.postcode, {
            id: 1,
            type: 'Feature',
            properties: {
                'carmen:center': [1,1],
                'carmen:text': '10000'
            },
            geometry: {
                type: 'Point',
                coordinates: [1,1]
            }
        }, t.end);
    });
    tape('build queued features', (t) => {
        var q = queue();
        Object.keys(conf).forEach(function(c) {
            q.defer(function(cb) {
                buildQueued(conf[c], cb);
            });
        });
        q.awaitAll(t.end);
    });

    tape('query: 10000', (t) => {
        c.geocode('10000', {}, function(err, res) {
            t.ifError(err);
            t.equal(res.features[0].place_name, '10000, United States');
            t.end();
        });
    });

    tape('query: 10000, language: es', (t) => {
        c.geocode('10000', { language: 'es' }, function(err, res) {
            t.ifError(err);
            t.equal(res.features[0].place_name, '10000, Estados Unidos');
            t.end();
        });
    });

    tape('query: 10000, language: es, languageMode: strict', (t) => {
        c.geocode('10000', { language: 'es', languageMode: 'strict' }, function(err, res) {
            t.ifError(err);
            t.equal(res.features[0].place_name, '10000, Estados Unidos');
            t.end();
        });
    });

    tape('query: 1,1', (t) => {
        c.geocode('1,1', {}, function(err, res) {
            t.ifError(err);
            t.equal(res.features[0].place_name, '10000, United States');
            t.end();
        });
    });

    tape('query: 1,1, language: es', (t) => {
        c.geocode('1,1', { language: 'es' }, function(err, res) {
            t.ifError(err);
            t.equal(res.features[0].place_name, '10000, Estados Unidos');
            t.end();
        });
    });

    tape('query: 1,1, language: es, languageMode: strict', (t) => {
        c.geocode('1,1', { language: 'es', languageMode: 'strict' }, function(err, res) {
            t.ifError(err);
            t.equal(res.features[0].place_name, '10000, Estados Unidos');
            t.end();
        });
    });

    tape('teardown', (t) => {
        context.getTile.cache.reset();
        t.end();
    });
})();
