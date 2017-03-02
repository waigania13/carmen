var tape = require('tape');
var closestLangLabel = require('../lib/util/closest-lang');
var Carmen = require('..');
var mem = require('../lib/api-mem');
var context = require('../lib/context');
var queue = require('d3-queue').queue;
var addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;


(function() {
    var conf = {
        country: new mem({ maxzoom:6 }, function() {}),
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
    tape('build queued features', function(t) {
        var q = queue();
        Object.keys(conf).forEach(function(c) {
            q.defer(function(cb) {
                buildQueued(conf[c], cb);
            });
        });
        q.awaitAll(t.end);
    });

    tape('query: الولايات المتحدة الامريكانية', function(assert) {
        c.geocode('الولايات المتحدة الامريكانية', { language: 'ar', languageMode: 'strict'}, function(err, res) {
            console.log('res', res);
            assert.ifError(err);
            assert.end();
        });
    });

    tape('teardown', function(assert) {
        context.getTile.cache.reset();
        assert.end();
    });
})();