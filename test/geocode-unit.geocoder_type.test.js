var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature');

var conf = {
    address:    new mem({maxzoom: 12, geocoder_address: 1}, function() {}),
    poi:        new mem({maxzoom: 12}, function() {})
};
var c = new Carmen(conf);
tape('index address', function(t) {
    var address = {
        id:1,
        type: 'Feature',
        properties:  {
            'carmen:text': 'fake street',
            'carmen:addressnumber': [100],
            'carmen:center': [-77.04312264919281,38.91041215085371]
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [[-77.04312264919281,38.91041215085371]]
        }
    };
    addFeature(conf.address, address, t.end);
});
tape('index poi', function(t) {
    var poi = {
        id:1,
        type: 'Feature',
        properties:  {
            'carmen:text': 'big bank',
            'carmen:center': [-77.04441547393799,38.909427030614665]
        },
        geometry: {
            type: 'Point',
            coordinates: [-77.04441547393799,38.909427030614665]
        }
    };
    addFeature(conf.poi, poi, t.end);
});
tape('query on address but still returns poi due to index order', function(t) {
    c.geocode('-77.04312264919281,38.91041215085371', {}, function(err, res) {
        t.ifError(err);
        t.equals(res.features[0].place_name, 'big bank, fake street', 'found POI');
        t.equals(res.features[0].relevance, 1);
        t.end();
    });
});
tape('query on poi returns poi', function(t) {
    c.geocode('-77.04441547393799,38.909427030614665', {}, function(err, res) {
        t.ifError(err);
        t.equals(res.features[0].place_name, 'big bank, fake street', 'found POI');
        t.equals(res.features[0].relevance, 1);
        t.end();
    });
});

tape('index.teardown', function(assert) {
    index.teardown();
    context.getTile.cache.reset();
    assert.end();
});

