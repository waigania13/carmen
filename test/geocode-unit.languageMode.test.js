var tape = require('tape');
var Carmen = require('..');
var mem = require('../lib/api-mem');
var context = require('../lib/context');
var addFeature = require('../lib/util/addfeature');

(function() {
    var conf = {
        country: new mem({ maxzoom:6, geocoder_name: 'country' }, function() {})
    };
    var c = new Carmen(conf);

    tape('index country', function(assert) {
        addFeature(conf.country, {
            type: 'Feature',
            id: 1,
            properties: {
                'carmen:center': [1,1],
                'carmen:text_zh': '中国',
                'carmen:text_en': 'China',
                'carmen:text': 'China'
            },
            geometry: {
                type: 'Point',
                coordinates: [2,2]
            }
        }, assert.end);
    });

    tape('index country', function(assert) {
        addFeature(conf.country, {
            id: 2,
            type: 'Feature',
            properties: {
                'carmen:center': [2,2],
                'carmen:text_en': 'Canada',
                'carmen:text': 'Canada'
            },
            geometry: {
                type: 'Point',
                coordinates: [2,2]
            }
        }, assert.end);
    });

    tape('index country', function(assert) {
        addFeature(conf.country, {
            id: 3,
            type: 'Feature',
            properties: {
                'carmen:center': [3,3],
                'carmen:text': 'Cambodia'
            },
            geometry: {
                type: 'Point',
                coordinates: [3,3]
            }
        }, assert.end);
    });

    tape('query: c, language: zh, languageMode: strict', function(assert) {
        c.geocode('c', { language: 'zh', languageMode: 'strict' }, function(err, res) {
            assert.ifError(err);
            assert.equal(res.features.length, 1, 'filters features to just those with "zh" (x1)');
            assert.equal(res.features[0].place_name, '中国', '0 - China');
            assert.end();
        });
    });

    tape('query: c, language: en, languageMode: strict', function(assert) {
        c.geocode('c', { language: 'en', languageMode: 'strict' }, function(err, res) {
            assert.ifError(err);
            assert.equal(res.features.length, 2, 'filters features to just those with "en" (x2)');
            assert.equal(res.features[0].place_name, 'China', '0 - China');
            assert.equal(res.features[1].place_name, 'Canada', '1 - Canada');
            assert.end();
        });
    });

    tape('query: c, languageMode: strict', function(assert) {
        c.geocode('c', { languageMode: 'strict' }, function(err, res) {
            assert.ifError(err);
            assert.equal(res.features.length, 3, 'does nothing without language code');
            assert.equal(res.features[0].place_name, 'China', '0 - China');
            assert.equal(res.features[1].place_name, 'Canada', '1 - Canada');
            assert.equal(res.features[2].place_name, 'Cambodia', '2 - Cambodia');
            assert.end();
        });
    });

    tape('query: c, language: en, languageMode: bogus', function(assert) {
        c.geocode('c', { language: 'en', languageMode: 'bogus' }, function(err, res) {
            assert.equal(err && err.toString(), 'Error: \'bogus\' is not a valid language mode');
            assert.end();
        });
    });
})();

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});
