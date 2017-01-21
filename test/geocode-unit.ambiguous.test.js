var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature');

var conf = {
    country: new mem({maxzoom: 6}, function() {}),
    place: new mem({maxzoom: 12}, function() {})
};

var c = new Carmen(conf);

tape('index countries', function(t) {
    var docs = [];

    var nigeria = {
        id: 1,
        type: 'Feature',
        properties: {
            'carmen:text':'Nigeria',
            'carmen:score':25000,
            'carmen:zxy':['6/32/29','6/33/29'],
            'carmen:center':[8.4, 13.9]
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[[4.625,14.178],[4.625,16.636],[11.25,16.636],[11.25,14.178],[4.625,14.178]]]
        }
    };
    docs.push(nigeria);

    var niger = {
        id: 2,
        type: 'Feature',
        properties: {
            'carmen:text':'Niger',
            'carmen:score':1200,
            'carmen:zxy':['6/32/29','6/32/30'],
            'carmen:center':[2.8, 11.1]
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[[0,5.615],[0,14.178],[5.625,14.178],[5.625,5.615],[0,5.615]]]
        }
    };
    docs.push(niger);

    addFeature(conf.country, docs, t.end);
});

tape('index place', function(t) {
    var docs = [];

    var niamey = {
        id: 1,
        type: 'Feature',
        properties: {
            'carmen:text':'Niamey',
            'carmen:score':50,
            'carmen:zxy':['12/2071/1891'],
            'carmen:center':[2.1, 13.6]
        }
    };
    docs.push(niamey);

    addFeature(conf.place, docs, t.end);
});

tape('search country', function(t) {
    c.geocode('niamey niger', {}, function(err, res) {
        t.equal(res.features[0].relevance, 1, "features stack and relevance is 1");
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});