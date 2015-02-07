var queue = require('queue-async');
var fs = require('fs');
var util = require('util');
var Carmen = require('..');
var index = require('../lib/index');
var feature = require('../lib/util/feature');
var mem = require('../lib/api-mem');
var UPDATE = process.env.UPDATE;
var test = require('tape');

(function() {
    var conf = {
        province: new mem(null, function() {}),
        city: new mem(null, function() {}),
        street: new mem({ maxzoom:6, geocoder_address:1 }, function() {})
    };
    var c = new Carmen(conf);
    test('index province', function(t) {
        var province = {
            _id:1,
            _text:'new york, ny',
            _zxy:['6/32/32','6/33/32'],
            _center:[0,0]
        };
        conf.province.putGrid(6, 32, 32, solidGrid(province));
        conf.province.putGrid(6, 33, 32, solidGrid(province));
        index.update(conf.province, [province], 6, t.end);
    });
    test('index city 1', function(t) {
        var city = {
            _id:1,
            _text:'new york, ny',
            _zxy:['6/32/32'],
            _center:[0,0]
        };
        conf.city.putGrid(6, 32, 32, solidGrid(city));
        index.update(conf.city, [city], 6, t.end);
    });
    test('index city 2', function(t) {
        var city = {
            _id:2,
            _text:'tonawanda',
            _zxy:['6/33/32'],
            _center:[360/64,0]
        };
        conf.city.putGrid(6, 33, 32, solidGrid(city));
        index.update(conf.city, [city], 6, t.end);
    });
    test('index street 1', function(t) {
        var street = {
            _id:1,
            _text:'west st',
            _zxy:['6/32/32'],
            _center:[0,0]
        };
        conf.street.putGrid(6, 32, 32, solidGrid(street));
        index.update(conf.street, [street], 6, t.end);
    });
    test('index street 2', function(t) {
        var street = {
            _id:2,
            _text:'west st',
            _zxy:['6/33/32'],
            _center:[360/64,0]
        };
        conf.street.putGrid(6, 33, 32, solidGrid(street));
        index.update(conf.street, [street], 6, t.end);
    });
    test('west st, tonawanda, ny', function(t) {
        c.geocode('west st tonawanda ny', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'west st, tonawanda, new york');
            t.end();
        });
    });
    test('west st, new york, ny', function(t) {
        c.geocode('west st new york ny', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'west st, new york, new york');
            t.end();
        });
    });
    test('new york', function(t) {
        c.geocode('new york', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'new york');
            t.deepEqual(res.features[0].id, 'province.1');
            t.end();
        });
    });
    test('new york new york', function(t) {
        c.geocode('new york new york', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'new york, new york');
            t.deepEqual(res.features[0].id, 'city.1');
            t.end();
        });
    });
    test('ny ny', function(t) {
        c.geocode('ny ny', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'new york, new york');
            t.deepEqual(res.features[0].id, 'city.1');
            t.end();
        });
    });
    // failing
    test.skip('new york ny', function(t) {
        c.geocode('new york ny', { limit_verify:2 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'new york, new york');
            t.deepEqual(res.features[0].id, 'city.1');
            t.end();
        });
    });
})();

// Confirm that for equally relevant features across three indexes
// the first in hierarchy beats the others. (NO SCORES)
(function() {
    var conf = {
        country: new mem(null, function() {}),
        province: new mem(null, function() {}),
        city: new mem(null, function() {}),
    };
    var c = new Carmen(conf);
    test('index country', function(t) {
        var country = {
            _id:1,
            _text:'china',
            _zxy:['6/32/32'],
            _center:[0,0]
        };
        conf.country.putGrid(6, 32, 32, solidGrid(country));
        index.update(conf.country, [country], 6, t.end);
    });
    test('index province', function(t) {
        var province = {
            _id:1,
            _text:'china',
            _zxy:['6/33/32'],
            _center:[360/64,0]
        };
        conf.province.putGrid(6, 33, 32, solidGrid(province));
        index.update(conf.province, [province], 6, t.end);
    });
    test('index city', function(t) {
        var city = {
            _id:1,
            _text:'china',
            _zxy:['6/34/32'],
            _center:[360/64*2,0]
        };
        conf.city.putGrid(6, 34, 32, solidGrid(city));
        index.update(conf.city, [city], 6, t.end);
    });
    test('china', function(t) {
        c.geocode('china', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'china');
            t.deepEqual(res.features[0].id, 'country.1');
            t.end();
        });
    });
})();

// Confirm that for equally relevant features across three indexes
// the one with the highest score beats the others.
(function() {
    var conf = {
        country: new mem(null, function() {}),
        province: new mem(null, function() {}),
        city: new mem(null, function() {}),
    };
    var c = new Carmen(conf);
    test('index country', function(t) {
        var country = {
            _id:1,
            _score: 5,
            _text:'china',
            _zxy:['6/32/32'],
            _center:[0,0]
        };
        conf.country.putGrid(6, 32, 32, solidGrid(country));
        index.update(conf.country, [country], 6, t.end);
    });
    test('index province', function(t) {
        var province = {
            _id:2,
            _score: 10,
            _text:'china',
            _zxy:['6/33/32'],
            _center:[360/64,0]
        };
        conf.province.putGrid(6, 33, 32, solidGrid(province));
        index.update(conf.province, [province], 6, t.end);
    });
    test('index city', function(t) {
        var city = {
            _id:3,
            _score: 6,
            _text:'china',
            _zxy:['6/34/32'],
            _center:[360/64*2,0]
        };
        conf.city.putGrid(6, 34, 32, solidGrid(city));
        index.update(conf.city, [city], 6, t.end);
    });
    test('china', function(t) {
        c.geocode('china', { limit_verify:3 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].id, 'province.2');
            t.deepEqual(res.features[1].id, 'city.3');
            t.deepEqual(res.features[2].id, 'country.1');
            t.end();
        });
    });
})();

(function() {
    var conf = {
        province: new mem(null, function() {}),
        postcode: new mem(null, function() {}),
        city: new mem(null, function() {}),
        street: new mem({ maxzoom:6, geocoder_address:1 }, function() {})
    };
    var c = new Carmen(conf);
    test('index province', function(t) {
        var province = {
            _id:1,
            _text:'connecticut, ct',
            _zxy:['6/32/32'],
            _center:[0,0]
        };
        conf.province.putGrid(6, 32, 32, solidGrid(province));
        index.update(conf.province, [province], 6, t.end);
    });
    test('index city', function(t) {
        var city = {
            _id:1,
            _text:'windsor',
            _zxy:['6/32/32'],
            _center:[0,0]
        };
        conf.city.putGrid(6, 32, 32, solidGrid(city));
        index.update(conf.city, [city], 6, t.end);
    });
    test('index street', function(t) {
        var street = {
            _id:1,
            _text:'windsor ct',
            _zxy:['6/33/32'],
            _center:[360/64,0]
        };
        conf.street.putGrid(6, 33, 32, solidGrid(street));
        index.update(conf.street, [street], 6, t.end);
    });
    // failing
    // city beats street at spatialmatch
    test.skip('windsor ct (limit 1)', function(t) {
        c.geocode('windsor ct', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'windsor, connecticut');
            t.deepEqual(res.features[0].id, 'city.1');
            t.end();
        });
    });
    // failing
    // city beats street at context sort
    test.skip('windsor ct (limit 2)', function(t) {
        c.geocode('windsor ct', { limit_verify:2 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'windsor, connecticut');
            t.deepEqual(res.features[0].id, 'city.1');
            t.end();
        });
    });
})();
