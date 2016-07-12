var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature');

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
            'carmen:text':'North Colorado',
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
            'carmen:text':'Parker Town',
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
    c.geocode('Parker Town North Colorado', {limit_verify: 1}, function(err, res) {
        t.ifError(err);
        t.equal(res.features[0].text, "Parker Town", "ok when query is ordered `{place} {region}`")
    });
    // c.geocode('North Colorado Parker Town', {limit_verify: 1}, function(err, res) {
    //     t.ifError(err);
    //     t.equal(res.features[0].text, "Parker Town", "ok when query is ordered `{region} {place}`")
    // });
    t.end();
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});