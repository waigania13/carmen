var test = require('tape');
var score = require('../lib/util/score');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature');

var conf = {
    country: new mem(null, function() {}),
    region: new mem(null, function() {}),
    district: new mem(null, function() {}),
    place: new mem(null, function() {}),
    locality: new mem(null, function() {})
}

var c = new Carmen(conf);

test('add country', function(t) {
    addFeature(conf.country, {
        id: 1,
        properties: {
            'carmen:text':'USA',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0],
            'carmen:score':1000
        }
    }, t.end);
});

test('add region', function(t) {
    addFeature(conf.region, {
        id: 1,
        properties: {
            'carmen:text':'Virginia',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0],
            'carmen:score':800
        }
    }, t.end);
});

test('add district', function(t) {
    addFeature(conf.district, {
        id: 1,
        properties: {
            'carmen:text':'Maryland',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0],
            'carmen:score':100
        }
    }, t.end);
});

test('add place', function(t) {
    addFeature(conf.place, {
        id: 1,
        properties: {
            'carmen:text':'Washington',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0],
            'carmen:score':50
        }
    }, t.end);
});

test('add locality', function(t) {
    addFeature(conf.locality, {
        id: 1,
        properties: {
            'carmen:text':'Arlington',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0],
            'carmen:score':10
        }
    }, t.end);
});

test('allowed max score is 7x the max of the median index', function(t) {
    var max = score.setMax(c);
    t.equal(max, 700, '[10, 50, 100, 800, 1000] => 100*7');
    t.end();
});

test('make sure max is set', function(t) {
    t.notOk(c.maxScore, "maxScore not yet set")
    c.geocode("USA", null, function(err, res) {
        t.equal(c.maxScore, 700, "max score set to 7x median");
        t.end();
    });
});

test('teardown', function(t) {
    context.getTile.cache.reset();
    t.end();
});
