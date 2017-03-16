//Ensure that results that have equal relev in phrasematch
//are matched against the 0.5 relev bar instead of 0.75

var tape = require('tape');
var Carmen = require('..');
var mem = require('../lib/api-mem');
var queue = require('d3-queue').queue;
var addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

var conf = {
    country: new mem({ maxzoom: 6, geocoder_languages: ['es', 'ru', 'zh_Latn'] }, function() {}),
    region: new mem({ maxzoom: 6, geocoder_languages: ['es', 'ru', 'zh_Latn'] }, function() {})
};
var c = new Carmen(conf);

tape('index region with bad language code', function(t) {
    var conf2 = {
        country: new mem({ maxzoom: 6, geocoder_languages: ['es', 'ru', 'zh_Latn'] }, function() {}),
        region: new mem({ maxzoom: 6, geocoder_languages: ['es', 'ru', 'zh_Latn'] }, function() {})
    };
    var c2 = new Carmen(conf2);
    t.ok(c2);
    var region = {
        type: 'Feature',
        properties: {
            'carmen:center': [ 0, 0 ],
            'carmen:zxy': [ '6/30/30' ],
            'carmen:text_fake': 'beetlejuice',
            'carmen:text': 'Northwestern Federal District,  Severo-Zapadny federalny okrug'
        },
        id: 2,
        geometry: { type: 'MultiPolygon', coordinates: [] },
        bbox: [ -11.25, 5.615, -5.625, 11.1784 ]
    };
    queueFeature(conf2.region, region, function() { buildQueued(conf2.region, function(err) {
        t.equal(err.message, 'fake is an invalid language code');
        t.end();
    })});
});

tape('index country', function(t) {
    var country = {
        type: 'Feature',
        properties: {
            'carmen:center': [ 0, 0 ],
            'carmen:zxy': [ '6/30/30' ],
            'carmen:text': 'Russian Federation, Rossiyskaya Federatsiya',
            'carmen:text_ru': 'Российская Федерация',
            'carmen:text_zh_Latn': 'Elousi',
            'carmen:text_es': null
        },
        id: 2,
        geometry: { type: 'MultiPolygon', coordinates: [] },
        bbox: [ -11.25, 5.615, -5.625, 11.1784 ]
    };
    queueFeature(conf.country, country, t.end);
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

tape('russia => Russian Federation', function(t) {
    c.geocode('russia', { limit_verify:1 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'Russian Federation');
        t.deepEqual(res.features[0].id, 'country.2');
        t.deepEqual(res.features[0].id, 'country.2');
        t.end();
    });
});

tape('Rossiyskaya ==> Russian Federation (synonyms are not available in autoc)', function(t) {
    c.geocode('Rossiyskaya', { limit_verify:1 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'Russian Federation');
        t.deepEqual(res.features[0].id, 'country.2');
        t.deepEqual(res.features[0].id, 'country.2');
        t.equal(res.features[0].matching_place_name, 'Rossiyskaya Federatsiya', 'matching_place_name contains synonym text')
        t.end();
    });
});

tape('Российская => Russian Federation (autocomplete without language flag)', function(t) {
    c.geocode('Российская', { limit_verify:1 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features.length, 1, '1 result');
        t.deepEqual(res.features[0].place_name, 'Russian Federation');
        t.ok(res.features[0].relevance < .8, 'Relevance penalty was applied for out-of-language match');
        t.deepEqual(res.features[0].id, 'country.2');
        t.deepEqual(res.features[0].id, 'country.2');
        t.end();
    });
});

tape('Российская => Российская Федерация (autocomplete with language flag)', function(t) {
    c.geocode('Российская', { limit_verify:1, language: 'ru' }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features.length, 1, '1 result');
        t.deepEqual(res.features[0].place_name, 'Российская Федерация');
        t.deepEqual(res.features[0].language, 'ru');
        t.ok(res.features[0].relevance > .9, 'No relevance penalty was applied for in-language match');
        t.deepEqual(res.features[0].id, 'country.2');
        t.deepEqual(res.features[0].id, 'country.2');
        t.end();
    });
});

tape('Российская Федерация => Russian Federation', function(t) {
    c.geocode('Российская Федерация', { limit_verify:1 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'Russian Federation');
        t.deepEqual(res.features[0].id, 'country.2');
        t.deepEqual(res.features[0].id, 'country.2');
        t.end();
    });
});

// carmen:text_zh_Latn should be indexed as a synonym for _text since
// as zh_Latn is a valid language code with IETF tag
tape('Elousi => Russian Federation', function(t) {
    c.geocode('Elousi', { limit_verify:1 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'Russian Federation');
        t.deepEqual(res.features[0].id, 'country.2');
        t.deepEqual(res.features[0].id, 'country.2');
        t.end();
    });
});

// carmen:text_fake should not be indexed as a synonym for _text since
// 'fake' is not a valid language code
tape('beetlejuice => [fail]', function(t) {
    c.geocode('beetlejuice', { limit_verify:1 }, function(err, res) {
        t.ifError(err);
        t.notOk(res.features[0]);
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