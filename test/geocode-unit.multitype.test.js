// Test multitype behavior

var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('d3-queue').queue;
var addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

var conf = {
    region: new mem({maxzoom:6, geocoder_types:['region','place']}, () => {}),
    place: new mem({maxzoom:6}, () => {}),
    poi: new mem({maxzoom:6}, () => {})
};
var c = new Carmen(conf);

tape('index region', (t) => {
    queueFeature(conf.region, {
        id:1,
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [-40,-40],
                [-40,40],
                [40,40],
                [40,-40],
                [-40,-40]
            ]]
        },
        properties: {
            'carmen:types': ['region', 'place'],
            'carmen:text': 'caracas',
            'carmen:center': [0,0]
        }
    }, t.end);
});

tape('index place', (t) => {
    queueFeature(conf.place, {
        id:1,
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [-40,-40],
                [-40,40],
                [40,40],
                [40,-40],
                [-40,-40]
            ]]
        },
        properties: {
            'carmen:text': 'libertador',
            'carmen:center': [0,0]
        }
    }, t.end);
});

tape('index poi', (t) => {
    queueFeature(conf.poi, {
        id:1,
        geometry: {
            type: 'Point',
            coordinates: [0,0]
        },
        properties: {
            'carmen:text': 'cafe',
            'carmen:center': [0,0]
        }
    }, t.end);
});
tape('build queued features', (t) => {
    var q = queue();
    Object.keys(conf).forEach(function(c) {
        q.defer(function(cb) {
            buildQueued(conf[c], cb);
        });
    });
    q.awaitAll(t.end);
});

tape('multitype reverse', (t) => {
    t.comment('query:  0,0');
    t.comment('result: cafe, libertador, caracas');
    t.comment('note:   returns full context, no shifts');
    c.geocode('0,0', {}, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'cafe, libertador, caracas');
        t.deepEqual(res.features[0].id, 'poi.1');
        t.deepEqual(res.features[0].context, [{
            id: 'place.1',
            text: 'libertador'
        }, {
            id: 'region.1',
            text: 'caracas'
        }]);
        t.end();
    });
});

tape('multitype reverse, types=poi', (t) => {
    t.comment('query:  0,0');
    t.comment('result: cafe, libertador, caracas');
    t.comment('note:   returns full context, no shifts');
    c.geocode('0,0', {types:['poi']}, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'cafe, libertador, caracas');
        t.deepEqual(res.features[0].id, 'poi.1');
        t.deepEqual(res.features[0].context, [{
            id: 'place.1',
            text: 'libertador'
        }, {
            id: 'region.1',
            text: 'caracas'
        }]);
        t.end();
    });
});

tape('multitype reverse, types=place', (t) => {
    t.comment('query:  0,0');
    t.comment('result: liberatador, caracas');
    t.comment('note:   returns libertador, caracas, no shift');
    c.geocode('0,0', {types:['place']}, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'libertador, caracas');
        t.deepEqual(res.features[0].id, 'place.1');
        t.end();
    });
});

tape('multitype reverse, types=region', (t) => {
    t.comment('query:  0,0');
    t.comment('result: caracas');
    t.comment('note:   returns caracas, no shift');
    c.geocode('0,0', {types:['region']}, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'caracas');
        t.deepEqual(res.features[0].id, 'region.1');
        t.end();
    });
});

tape('multitype reverse, types=place,region', (t) => {
    t.comment('query:  0,0');
    t.comment('result: libertador, caracas');
    t.comment('note:   returns libertador, caracas, no shift');
    c.geocode('0,0', {types:['place','region']}, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'libertador, caracas');
        t.deepEqual(res.features[0].id, 'place.1');
        t.end();
    });
});

tape('multitype forward, q=cafe', (t) => {
    t.comment('query:  cafe');
    t.comment('result: cafe, libertador, caracas');
    t.comment('note:   returns full context, no shifts');
    c.geocode('cafe', {}, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'cafe, libertador, caracas');
        t.deepEqual(res.features[0].id, 'poi.1');
        t.deepEqual(res.features[0].context, [{
            id: 'place.1',
            text: 'libertador'
        }, {
            id: 'region.1',
            text: 'caracas'
        }]);
        t.end();
    });
});

tape('multitype forward, q=libertador', (t) => {
    t.comment('query:  libertador');
    t.comment('result: libertador, caracas');
    t.comment('note:   returns full context, no shifts');
    c.geocode('libertador', {}, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'libertador, caracas');
        t.deepEqual(res.features[0].id, 'place.1');
        t.deepEqual(res.features[0].context, [{
            id: 'region.1',
            text: 'caracas'
        }]);
        t.end();
    });
});

tape('multitype forward, q=caracas', (t) => {
    t.comment('query:  caracas');
    t.comment('result: caracas');
    t.comment('note:   returns caracas with shift');
    c.geocode('caracas', {}, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'caracas');
        t.deepEqual(res.features[0].id, 'place.1');
        t.end();
    });
});

tape('multitype forward, q=caracas, types=place', (t) => {
    t.comment('query:  caracas');
    t.comment('result: caracas');
    t.comment('note:   returns caracas with shift');
    c.geocode('caracas', { types: ['place'] }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'caracas');
        t.deepEqual(res.features[0].id, 'place.1');
        t.end();
    });
});

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
