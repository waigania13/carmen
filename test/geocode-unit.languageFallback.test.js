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
        country: new mem({ maxzoom: 6, geocoder_languages: ['ur', 'en', 'fa'] }, function() {}),
    };
    var c = new Carmen(conf);

    tape('index country', (t) => {
        queueFeature(conf.country, {
            type: 'Feature',
            id: 1,
            properties: {
                'carmen:center': [1,1],
                'carmen:text': 'United States',
                'carmen:text_en': 'United States'
            },
            geometry: {
                type: 'Point',
                coordinates: [1,1]
            }
        }, t.end);
    });
    tape('index country2', (t) => {
        queueFeature(conf.country, {
            type: 'Feature',
            id: 2,
            properties: {
                'carmen:center': [1,1],
                'carmen:text': 'india',
                'carmen:text_ur': 'بھارت',
                'carmen:text_fa': 'هندوستان'
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

    tape('make sure indexes contain pre-computed fallbacks', (t) => {
        t.deepEquals(
            conf.country._geocoder.grid.list(),
            [
                [ 'india', [ 0, 1 ] ],
                [ 'united states', [ 0, 1, 2, 3 ] ],
                [ 'بھارت', [ 3 ] ],
                [ 'هندوستان', [ 2 ] ]
            ],
            "fallbacks have been properly computed"
        );
        t.end();
    })

    tape('query: United States', (t) => {
        c.geocode('United States', { language: 'ar'}, function(err, res) {
            t.equal('United States', res.features[0].text, 'Fallback to English');
            t.equal('en', res.features[0].language, 'Language returned is English');
            t.ifError(err);
            t.end();
        });
    });

    tape('query: India', (t) => {
        c.geocode('India', { language: 'ar'}, function(err, res) {
            t.equal('بھارت', res.features[0].text, 'Heuristically falls back to Urdu');
            t.equal('ur', res.features[0].language, 'Language returned is Urdu');
            t.ifError(err);
            t.end();
        });
    });

    tape('teardown', (t) => {
        context.getTile.cache.reset();
        t.end();
    });
})();
