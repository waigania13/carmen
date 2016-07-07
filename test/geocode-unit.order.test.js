var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('d3-queue').queue;
var addFeature = require('../lib/util/addfeature');
var unidecode = require('unidecode-cxx');
var token = require('../lib/util/token');
var termops = require('../lib/util/termops');

var conf = {
    country: new mem(null, function() {}),
    region: new mem(null, function() {}),
    district: new mem(null, function() {}),
    place: new mem(null, function() {}),
    address: new mem({
        maxzoom: 6,
        geocoder_address: 1
    }, function() {})
};
var c = new Carmen(conf);

tape('index country', function(t) {
    var country = {
        id:1,
        properties: {
            'carmen:text':'United States',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.country, country, t.end);
});

tape('index region', function(t) {
    var region = {
        id:2,
        properties: {
            'carmen:text':'Colorado',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.region, region, t.end);
});

tape('index place', function(t) {
    var place = {
        id:5,
        properties: {
            'carmen:text':'Parker',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.place, place, t.end);
});

tape('index address', function(t) {
    var address = {
        id:6,
        properties: {
            'carmen:text':'S Pikes Peak Dr',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0],
            'carmen:addressnumber': ['11027']
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [[0,0],[0,0],[0,0]]
        }
    };
    addFeature(conf.address, address, t.end);
});

tape('Check order', function(t) {
    c.geocode('Parker Colorado', {limit_verify: 1}, function(err, res) {
        t.ifError(err);
        t.equal(res.features[0].text, "Parker", "ok when query is ordered `{place} {region}`")
    });
    c.geocode('Colorado Parker', {limit_verify: 1}, function(err, res) {
        t.ifError(err);
        t.equal(res.features[0].text, "Parker", "ok when query is ordered `{region} {place}`")
    });
    t.end();
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});