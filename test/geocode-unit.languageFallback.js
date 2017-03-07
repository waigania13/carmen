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

    tape('index country', function(assert) {
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
        }, assert.end);
    });
    tape('index country2', function(assert) {
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
        }, assert.end);
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

    tape('make sure indexes contain pre-computed fallbacks', function(assert) {
        assert.deepEquals(
            conf.country._geocoder.grid.list(),
            [
                // these ones are from country2 -- we've fallen language 1 (English)
                // to default and left others as they are
                [ 'xbhrt', [ 3 ] ],
                [ 'xhndwstn', [ 2 ] ],
                [ 'xindia', [ 0, 1 ] ],

                // this is from country -- we've fallen everything back to the same phrase
                [ 'xunited states', [ 0, 1, 2, 3 ] ]
            ],
            "fallbacks have been properly computed"
        );
        assert.end();
    })

    tape('query: United States', function(assert) {
        c.geocode('United States', { language: 'ar'}, function(err, res) {
            assert.equal('United States', res.features[0].text, 'Fallback to English');
            assert.equal('en', res.features[0].language, 'Language returned is English');
            assert.ifError(err);
            assert.end();
        });
    });

    tape('query: India', function(assert) {
        c.geocode('India', { language: 'ar'}, function(err, res) {
            assert.equal('بھارت', res.features[0].text, 'Heuristically falls back to Urdu');
            assert.equal('ur', res.features[0].language, 'Language returned is Urdu');
            assert.ifError(err);
            assert.end();
        });
    });

    tape('teardown', function(assert) {
        context.getTile.cache.reset();
        assert.end();
    });
})();