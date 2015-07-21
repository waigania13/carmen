// spatialmatch test to ensure the highest relev for a stacked zxy cell
// is used, disallowing a lower scoring cell from overwriting a previous
// entry.

var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature');

var conf = {
    place: new mem({maxzoom: 6}, function() {}),
    address: new mem({maxzoom: 6, geocoder_address: 1}, function() {})
};
var c = new Carmen(conf);
tape('index place', function(t) {
    var feature = {
        _id:1,
        _text:'fakecity',
        _zxy:['6/32/32'],
        _center:[0,0],
    };
    addFeature(conf.place, feature, t.end);
});
tape('index matching address', function(t) {
    var feature = {
        _id:2,
        _text:'fake street',
        _zxy:['6/32/32','6/32/33'],
        _center:[0,0],
        _cluster: {
            '1': { type: "Point", coordinates: [0,0] }
        }
    };
    addFeature(conf.address, feature, t.end);
});
tape('index other address', function(t) {
    var feature = {
        _id:3,
        _text:'fake street',
        _zxy:['6/32/32'],
        _center:[0,0],
        _cluster: {
            '2': { type: "Point", coordinates: [0,0] }
        }
    };
    addFeature(conf.address, feature, t.end);
});
tape('test spatialmatch relev', function(t) {
    c.geocode('1 fake street fakecity', { limit_verify: 1 }, function (err, res) {
        t.ifError(err);
        t.equals(res.features.length, 1);
        t.equals(res.features[0].relevance, 1);
        t.equals(res.features[0].id, 'address.2');
        t.end();
    });
});

tape('index.teardown', function(assert) {
    index.teardown();
    assert.end();
});
