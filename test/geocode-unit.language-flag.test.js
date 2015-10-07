//Ensure that results that have equal relev in phrasematch
//are matched against the 0.5 relev bar instead of 0.75

var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var mem = require('../lib/api-mem');
var queue = require('queue-async');
var addFeature = require('../lib/util/addfeature');

var conf = {
    country: new mem({ maxzoom:6 }, function() {}),
    region: new mem({ maxzoom: 6, geocoder_format_ru: '{country._name}, {region._name}'}, function() {}),
    place: new mem({ maxzoom:6 }, function() {})
};
var c = new Carmen(conf);

tape('index country', function(t) {
    var country = {
        type: 'Feature',
        properties: {
            'carmen:center': [0,0],
            'carmen:zxy': ['6/32/32'],
            'carmen:text_es': null,
            'carmen:text_ru': 'Российская Федерация',
            'carmen:text': 'Russian Federation, Rossiyskaya Federatsiya'
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
    addFeature(conf.country, country, t.end);
});

tape('index city', function(t) {
    var place = {
        type: 'Feature',
        properties: {
            'carmen:center': [0,0],
            'carmen:zxy': ['6/32/32'],
            'carmen:text_ru': 'Санкт-Петербу́рг',
            'carmen:text': 'Saint Petersburg, St Petersburg'
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
    addFeature(conf.place, place, t.end);
});

tape('russia => Russian Federation', function(t) {
    c.geocode('russia', { limit_verify:1 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'Russian Federation');
        t.deepEqual(res.features[0].id, 'country.1');
        t.end();
    });
});

tape('Rossiyskaya => Russian Federation', function(t) {
    c.geocode('Rossiyskaya', { limit_verify:1 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'Russian Federation');
        t.deepEqual(res.features[0].id, 'country.1');
        t.end();
    });
});

tape('Rossiyskaya => Российская Федерация - {language: "ru"}', function(t) {
    c.geocode('Rossiyskaya', { limit_verify:1, language: 'ru' }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'Российская Федерация');
        t.deepEqual(res.features[0].id, 'country.1');
        t.end();
    });
});

// 'fake' is not a valid language code
tape('Rossiyskaya => Russian Federation - {language: "fake"}', function(t) {
    c.geocode('Rossiyskaya', { limit_verify:1, language: 'fake' }, function(err, res) {
        t.ok(err);
        t.deepEqual(err.message, '\'fake\' is not a valid language code');
        t.notOk(res);
        t.end();
    });
});

// no value for 'es'
tape('Rossiyskaya => Russian Federation - {language: "es"}', function(t) {
    c.geocode('Rossiyskaya', { limit_verify:1, language: 'es' }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'Russian Federation');
        t.deepEqual(res.features[0].id, 'country.1');
        t.end();
    });
});

// no value for 'fr'
tape('Rossiyskaya => Russian Federation - {language: "fr"}', function(t) {
    c.geocode('Rossiyskaya', { limit_verify:1, language: 'fr' }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'Russian Federation');
        t.deepEqual(res.features[0].id, 'country.1');
        t.end();
    });
});

// also 'translate' the context when available
tape('St Petersburg => Санкт-Петербу́рг, Российская Федерация - {language: "ru"}', function(t) {
    c.geocode('St Petersburg', { language: 'ru'}, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'Санкт-Петербу́рг, Российская Федерация');
        t.deepEqual(res.features[0].id, 'place.1');
        t.deepEqual(res.features[0].context[0].text, 'Российская Федерация');
        t.end();
    });
});

// no value for 'fr'
tape('St Petersberg => Saint Petersburg - {language: "fr"}', function(t) {
    c.geocode('St Petersburg', { limit_verify:1, language: 'fr' }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'Saint Petersburg, Russian Federation');
        t.deepEqual(res.features[0].id, 'place.1');
        t.deepEqual(res.features[0].context[0].text, 'Russian Federation');
        t.end();
    });
});

tape('index region', function(t) {
    var region = {
        type: 'Feature',
        properties: {
            'carmen:center': [0,0],
            'carmen:zxy': ['6/32/32'],
            'carmen:text_ru': 'Северо-Западный федеральный округ',
            'carmen:text': 'Northwestern Federal District,  Severo-Zapadny federalny okrug'
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
    addFeature(conf.region, region, t.end);
});

// custom response format template
tape('Northwestern Federal Distrct => Российская Федерация, Северо-Западный федеральный округ - {language: "ru"}', function(t) {
    c.geocode('Northwestern', { limit_verify:1, language: 'ru' }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'Российская Федерация, Северо-Западный федеральный округ');
        t.deepEqual(res.features[0].id, 'region.1');
        t.deepEqual(res.features[0].context[0].text, 'Российская Федерация');
        t.end();
    });
});

//Is not above 0.5 relev so should fail.
tape('fake blah blah => [fail]', function(t) {
    c.geocode('fake blah blah', { limit_verify:1 }, function(err, res) {
        t.ifError(err);
        t.notOk(res.features[0]);
        t.end();
    });
});

tape('index.teardown', function(assert) {
    index.teardown();
    assert.end();
});
