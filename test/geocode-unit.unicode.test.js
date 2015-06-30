//Ensure that results that have equal relev in phrasematch
//are matched against the 0.5 relev bar instead of 0.75

var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var mem = require('../lib/api-mem');
var queue = require('queue-async');
var addFeature = require('../lib/util/addfeature');

var conf = {
    test: new mem({ maxzoom:6 }, function() {})
};
var c = new Carmen(conf);
tape('index 京都市', function(t) {
    addFeature(conf.test, {
        _id:1,
        _text:'京都市',
        _zxy:['6/32/32'],
        _center:[0,0]
    }, t.end);
});
tape('index москва', function(t) {
    addFeature(conf.test, {
        _id:2,
        _text:'москва',
        _zxy:['6/32/32'],
        _center:[0,0]
    }, t.end);
});
tape('index josé', function(t) {
    addFeature(conf.test, {
        _id:3,
        _text:'josé',
        _zxy:['6/32/32'],
        _center:[0,0]
    }, t.end);
});

tape('京 => 京都市', function(t) {
    c.geocode('京', { limit_verify:1 }, function(err, res) {
        t.deepEqual(res.features[0].place_name, '京都市');
        t.end();
    });
});
tape('京都市 => 京都市', function(t) {
    c.geocode('京都市', { limit_verify:1 }, function(err, res) {
        t.deepEqual(res.features[0].place_name, '京都市');
        t.end();
    });
});
tape('jing => 京都市', function(t) {
    c.geocode('jing', { limit_verify:1 }, function(err, res) {
        t.deepEqual(res.features[0].place_name, '京都市');
        t.end();
    });
});
tape('jing du shi => 京都市', function(t) {
    c.geocode('jing du shi', { limit_verify:1 }, function(err, res) {
        t.deepEqual(res.features[0].place_name, '京都市');
        t.end();
    });
});
// partial unidecoded terms do not match
tape('ji => no results', function(t) {
    c.geocode('ji', { limit_verify:1 }, function(err, res) {
        t.equal(res.features.length, 0);
        t.end();
    });
});

tape('м => москва', function(t) {
    c.geocode('м', { limit_verify:1 }, function(err, res) {
        t.deepEqual(res.features[0].place_name, 'москва');
        t.end();
    });
});
tape('москва => москва', function(t) {
    c.geocode('москва', { limit_verify:1 }, function(err, res) {
        t.deepEqual(res.features[0].place_name, 'москва');
        t.end();
    });
});
tape('m => москва', function(t) {
    c.geocode('m', { limit_verify:1 }, function(err, res) {
        t.deepEqual(res.features[0].place_name, 'москва');
        t.end();
    });
});
tape('moskva => москва', function(t) {
    c.geocode('moskva', { limit_verify:1 }, function(err, res) {
        t.deepEqual(res.features[0].place_name, 'москва');
        t.end();
    });
});

tape('j => josé', function(t) {
    c.geocode('j', { limit_verify:1 }, function(err, res) {
        t.equal(res.features[0].place_name, 'josé');
        t.end();
    });
});
tape('jose => josé', function(t) {
    c.geocode('jose', { limit_verify:1 }, function(err, res) {
        t.equal(res.features[0].place_name, 'josé');
        t.end();
    });
});
tape('josé => josé', function(t) {
    c.geocode('josé', { limit_verify:1 }, function(err, res) {
        t.equal(res.features[0].place_name, 'josé');
        t.end();
    });
});


tape('index.teardown', function(assert) {
    index.teardown();
    assert.end();
});

