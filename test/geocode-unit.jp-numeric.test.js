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
        geocoder_address: 1,
        geocoder_tokens: {"[３3]丁目": "三丁目"}
    }, function() {})
};
var c = new Carmen(conf);

tape('index country', function(t) {
    var country = {
        id:1,
        properties: {
            'carmen:text':'Japan',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.country, country, t.end);
});

tape('index region', function(t) {
    var region = {
        id:1,
        properties: {
            'carmen:text':'東京都',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.region, region, t.end);
});

tape('index place 1', function(t) {
    var place = {
        id:1,
        properties: {
            'carmen:text':'羽村市',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.place, place, t.end);
});

tape('index address 1', function(t) {
    var address = {
        id:1,
        properties: {
            'carmen:text':'神明台三丁目',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0],
            'carmen:addressnumber': ['3', '5']
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [[0,0],[0,0],[0,0]]
        }
    };
    addFeature(conf.address, address, t.end);
});

tape('Check numeric text', function(t) {
    c.geocode('神明台3丁目5', { debug: true}, function(err, res) {
        t.ifError(err);
        t.false(res.features.length > 0, "no features");
        
    });
    c.geocode('神明台3丁目 5', { debug: true}, function(err, res) {
        t.ifError(err);
        t.equal(res.features.length, 1, "1 feature");
        t.equal(res.features[0].address,'3', "wrong address");
        
    });
    c.geocode('神明台三丁目5', { debug: true}, function(err, res) {
        t.ifError(err);
        t.equal(res.features.length, 1, "1 feature");
        t.equal(res.features[0].address, '5', "right address");
        
    });
    c.geocode('神明台三丁目 5', null, function(err, res) {
        t.ifError(err);
        t.equal(res.features.length, 1, "1 feature");
        t.equal(res.features[0].address, '5', "right address");
        t.end()
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});