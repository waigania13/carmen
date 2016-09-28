// Tests Windsor CT (city) vs Windsor Ct (street name)
// Windsor CT should win via stacky bonus.

var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature');

var conf = {
    country: new mem(null, function() {}),
    region: new mem(null, function() {}),
    place: new mem(null, function() {}),
    poi: new mem({'scoreranges':{'landmark':[0.5, 1]}, maxscore: 500, maxzoom: 6, geocoder_stack: 'cn'}, function() {})
};
var c = new Carmen(conf);
tape('index country', function(t) {
    addFeature(conf.country, {
        id:1,
        properties: {
            'carmen:score':25000,
            'carmen:text':'china',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0],
            'carmen:geocoder_stack':'cn'
        }
    }, t.end);
});
tape('index region', function(t) {
    addFeature(conf.region, {
        id:1,
        properties: {
            'carmen:score':3500,
            'carmen:text':'china',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0],
            'carmen:geocoder_stack':'cn'
        }
    }, t.end);
});
tape('index place', function(t) {
    addFeature(conf.place, {
        id:1,
        properties: {
            'carmen:score':2500,
            'carmen:text':'china',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0],
            'carmen:geocoder_stack':'cn'
        }
    }, t.end);
});
tape('index poi landmark', function(t) {
    addFeature(conf.poi, {
        id:2,
        properties: {
            'carmen:score':500,
            'carmen:text':'china lm',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0],
            'carmen:geocoder_stack':'cn'
        }
    }, t.end);
});
tape('index poi', function(t) {
    addFeature(conf.poi, {
        id:1,
        properties: {
            'carmen:score':5,
            'carmen:text':'china',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0],
            'carmen:geocoder_stack':'cn'
        }
    }, t.end);
});
// invalid options.types type
tape('china types: "asdf"', function(t) {
    c.geocode('china', { types: 'asdf' }, function(err, res) {
        t.equal(err && err.toString(), 'Error: options.types must be an array with at least 1 type');
        t.equal(err && err.code, 'EINVALID');
        t.end();
    });
});
// invalid options.types length
tape('china types: []', function(t) {
    c.geocode('china', { types: [] }, function(err, res) {
        t.equal(err && err.toString(), 'Error: options.types must be an array with at least 1 type');
        t.equal(err && err.code, 'EINVALID');
        t.end();
    });
});
// invalid options.types[0] value
tape('china types: ["asdf"]', function(t) {
    c.geocode('china', { types: ['asdf'] }, function(err, res) {
        t.equal(err && err.toString(), 'Error: Type "asdf" is not a known type. Must be one of: country, region, place, poi or poi.landmark');
        t.equal(err && err.code, 'EINVALID');
        t.end();
    });
});

// poi, poi.landmark returns all poi features
tape('china types:[poi.landmark, poi]', function(t) {
    c.geocode('china', { types:['poi.landmark', 'poi'] }, function(err, res) {
        t.ifError(err);
        console.log('res ', res);
        t.deepEqual(res.features.length, 2, '2 result');
        t.deepEqual(res.features[0].id, 'poi.2', 'subtypes work');
        t.end();
    });
});

//poi.landmark beats poi
tape('china types: ["poi.landmark"]', function(t) {
    c.geocode('china', { types:['poi.landmark'] }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features.length, 1, '1 result');
        t.deepEqual(res.features[0].id, 'poi.2', 'landmarks beat pois');
        t.end();
    });
});

//poi returns poi.landmark features also
tape('china poi returns poi.landmark also', function(t) {
    c.geocode('china', { types:['poi'] }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features.length, 2, '2 results');
        t.deepEqual(res.features[0].id, 'poi.2', 'landmark ranks higher than poi.');
        t.end();
    });
});
// country wins without type filter
tape('china', function(t) {
    c.geocode('china', { limit_verify:4 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features.length, 4, '4 results');
        t.deepEqual(res.features[0].id, 'country.1', 'country wins');
        t.end();
    });
});
// types: place
tape('china', function(t) {
    c.geocode('china', { limit_verify:3, types:['place'] }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features.length, 1, '1 result');
        t.deepEqual(res.features[0].id, 'place.1', 'place wins');
        t.end();
    });
});
// types: region, place
tape('china', function(t) {
    c.geocode('china', { limit_verify:3, types:['region','place'] }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features.length, 2, '2 results');
        t.deepEqual(res.features[0].id, 'region.1', 'region #1');
        t.deepEqual(res.features[1].id, 'place.1', 'place #2');
        t.end();
    });
});

// poi might win now?
// reverse without type filter
tape('reverse', function(t) {
    c.geocode('0,0', {}, function(err, res) {
        t.ifError(err);
        //not sure why this is 4. Needs to be 5 :thinking_face:
        t.deepEqual(res.features.length, 4, '4 results');
        t.deepEqual(res.features[0].id, 'poi.1', 'poi wins');
        t.end();
    });
});
tape('reverse: country', function(t) {
    c.geocode('0,0', { types:['country'] }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features.length, 1, '1 result');
        t.deepEqual(res.features[0].id, 'country.1', 'country wins');
        t.end();
    });
});
tape('reverse: country,place', function(t) {
    c.geocode('0,0', { types:['country','place'] }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features.length, 2, '2 results');
        t.deepEqual(res.features[0].id, 'place.1', '1: place');
        t.deepEqual(res.features[0].context, [
            { id:'region.1', text:'china' },
            { id:'country.1', text:'china' },
        ], 'preserves full context of place result (including region)');
        t.deepEqual(res.features[1].id, 'country.1', '2: country');
        t.deepEqual(res.features[1].context, undefined);
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});

