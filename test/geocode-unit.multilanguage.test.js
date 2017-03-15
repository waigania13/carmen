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
        country: new mem({
            maxzoom:6,
            geocoder_name: 'country'
        }, function() {}),
        place: new mem({
            maxzoom:6,
            geocoder_name: 'place',
            geocoder_format_es: '{place._name} {country._name}',
            geocoder_format_ja: '{country._name} {place._name}'
        }, function() {})
    };
    var c = new Carmen(conf);

    tape('index country', function(t) {
        var country = {
            type: 'Feature',
            properties: {
                'carmen:center': [0,0],
                'carmen:zxy': ['6/32/32'],
                'carmen:text': 'France',
                'carmen:text_en': 'France',
                'carmen:text_es': 'Francia',
                'carmen:text_ja': 'フランス'
            },
            id: 1,
            geometry: {
                type: 'MultiPolygon',
                coordinates: [
                    [[[0,-5.615985819155337],[0,0],[5.625,0],[5.625,-5.615985819155337],[0,-5.615985819155337]]]
                ]
            },
            bbox: [0,-5.615985819155337,5.625,0]
        };
        queueFeature(conf.country, country, t.end);
    });

    tape('index place', function(t) {
        var place = {
            type: 'Feature',
            properties: {
                'carmen:center': [0,0],
                'carmen:zxy': ['6/32/32'],
                'carmen:text': 'Paris',
                'carmen:text_en': 'Paris',
                'carmen:text_es': 'París',
                'carmen:text_ja': 'パリ'
            },
            id: 1,
            geometry: {
                type: 'MultiPolygon',
                coordinates: [
                    [[[0,-5.615985819155337],[0,0],[5.625,0],[5.625,-5.615985819155337],[0,-5.615985819155337]]]
                ]
            },
            bbox: [0,-5.615985819155337,5.625,0]
        };
        queueFeature(conf.place, place, t.end);
    });

    tape('build queued features', function(t) {
        var q = queue();
        Object.keys(conf).forEach(function(c) {
            q.defer(function(cb) {
                buildQueued(conf[c], cb);
            });
        });
        q.awaitAll(t.end);
    });

    tape('paris ?language=en,es,bogus', function(assert) {
        c.geocode('paris', { limit_verify:1, language: 'en,es,bogus' }, function(err, res) {
            assert.equal(err && err.toString(), 'Error: \'bogus\' is not a valid language code');
            assert.equal(err && err.code, 'EINVALID');
            assert.end();
        });
    });

    tape('paris ?language=en,es,ja', function(t) {
        c.geocode('paris', { limit_verify:1, language: 'en,es,ja' }, function(err, res) {
            t.ifError(err);
            t.equal(res.features[0].id, 'place.1');

            t.equal(res.features[0].text, 'Paris');
            t.equal(res.features[0].place_name, 'Paris France');
            t.equal(res.features[0].language, 'en');

            t.equal(res.features[0].text_en, 'Paris');
            t.equal(res.features[0].place_name_en, 'Paris France');
            t.equal(res.features[0].language_en, 'en');

            t.equal(res.features[0].text_es, 'París');
            t.equal(res.features[0].place_name_es, 'París Francia');
            t.equal(res.features[0].language_es, 'es');

            t.equal(res.features[0].text_ja, 'パリ');
            t.equal(res.features[0].place_name_ja, 'フランス パリ');
            t.equal(res.features[0].language_ja, 'ja');

            t.deepEqual(res.features[0].context, [{
                id: 'country.1',
                language: 'en',
                language_en: 'en',
                language_es: 'es',
                language_ja: 'ja',
                text: 'France',
                text_en: 'France',
                text_es: 'Francia',
                text_ja: 'フランス'
            }]);

            t.end();
        });
    });
})();

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});
