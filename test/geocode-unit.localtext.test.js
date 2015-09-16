//Ensure that results that have equal relev in phrasematch
//are matched against the 0.5 relev bar instead of 0.75

var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var mem = require('../lib/api-mem');
var queue = require('queue-async');
var addFeature = require('../lib/util/addfeature');

var conf = {
    country: new mem({ maxzoom:6 }, function() {})
};
var c = new Carmen(conf);

tape('index country', function(t) {
    var country = {
        type: 'Feature',
        properties: {
            'carmen:center': [ 0, 0 ],
            'carmen:zxy': [ '6/30/30' ],
            'carmen:text_ru': 'Российская Федерация',
            'carmen:text': 'Russian Federation, Rossiyskaya Federatsiya'
        },
        id: 2,
        geometry: { type: 'MultiPolygon', coordinates: [] },
        bbox: [ -11.25, 5.615, -5.625, 11.1784 ]
    };
    addFeature(conf.country, country, t.end);
});
tape('russia => russian federation', function(t) {
    c.geocode('russia', { limit_verify:1 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'Russian Federation');
        t.deepEqual(res.features[0].id, 'country.2');
        t.deepEqual(res.features[0].id, 'country.2');
        t.end();
    });
});
tape('Rossiyskaya => Russian Federation', function(t) {
    c.geocode('Rossiyskaya', { limit_verify:1 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'Russian Federation');
        t.deepEqual(res.features[0].id, 'country.2');
        t.deepEqual(res.features[0].id, 'country.2');
        t.end();
    });
});

tape('Российская => Russian Federation', function(t) {
    c.geocode('Российская', { limit_verify:1 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'Russian Federation');
        t.deepEqual(res.features[0].id, 'country.2');
        t.deepEqual(res.features[0].id, 'country.2');
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

