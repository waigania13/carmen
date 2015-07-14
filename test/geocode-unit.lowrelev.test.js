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
        _id:1,
        _text:'czech republic',
        _zxy:['6/32/32'],
        _center:[0,0]
    };
    addFeature(conf.country, country, t.end);
});
tape('index country2', function(t) {
    var country = {
        _id:2,
        _text:'fake country two',
        _zxy:['7/32/32'],
        _center:[0,0]
    };
    addFeature(conf.country, country, t.end);
});
tape('czech => czech republic', function(t) {
    c.geocode('czech', { limit_verify:1 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'czech republic');
        t.deepEqual(res.features[0].id, 'country.1');
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

