var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature');

var conf = {
    street: new mem(null, function() {})
};

var c = new Carmen(conf);

tape('index feature', function(t) {
    var feature = {
        id:1,
        properties: {
            'carmen:text':'Main St',
            'carmen:zxy':['6/14/18'],
            'carmen:center':[-100,60]
        }
    };
    addFeature(conf.street, feature, t.end);
});

tape('index feature', function(t) {
    var feature = {
        id:2,
        properties: {
            'carmen:text':'Main Street',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.street, feature, t.end);
});

// run query with invalid bbox, expect error
tape('fake bbox', function(t) {
    c.geocode('Main St', {bbox: [-1.0, -1.0, 1.0]}, function(err, res) {
        t.equal(err && err.code, 'EINVALID');
        t.end();
    });
});

// run query without bbox filter, expect both features back
tape('no bbox', function(t) {
    c.geocode('Main St', {}, function(err, res) {
        t.ifError(err);
        t.equals(res.features.length, 2);
        t.end();
    });
});

// run query with bbox fitler, expect only one feature back
tape('with bbox', function(t) {
    c.geocode('Main St', { bbox: [-1.0, -1.0, 1.0, 1.0]}, function(err, res) {
        t.ifError(err);
        t.equals(res.features.length, 1);
        t.end();
    });
});
