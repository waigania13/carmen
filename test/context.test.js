var fs = require('fs');
var util = require('util');
var Carmen = require('..');
var tilelive = require('tilelive');
var context = require('../lib/context');
var UPDATE = process.env.UPDATE;
var test = require('tape');
var zlib = require('zlib');
var path = require('path');
var mapnik = require('mapnik');
var mem = require('../lib/api-mem');

mapnik.register_datasource(path.join(mapnik.settings.paths.input_plugins,'ogr.input'));

test('context vector', function(t) {
    var geocoder = new Carmen({
        country: Carmen.auto(__dirname + '/fixtures/01-ne.country.s3'),
        province: Carmen.auto(__dirname + '/fixtures/02-ne.province.s3')
    });

    geocoder._open(function() {
        t.test('context vt full', function(q) {
            context(geocoder, 0, 40, null, true, function(err, contexts) {
                q.ifError(err);
                q.equal(2, contexts.length);
                if (UPDATE) fs.writeFileSync(__dirname + '/fixtures/context-vt-full.json', JSON.stringify(contexts, null, 4));
                q.deepEqual(require(__dirname + '/fixtures/context-vt-full.json'), contexts);
                q.end();
            });
        });
        t.test('context vt light', function(q) {
            context(geocoder, 0, 40, null, false, function(err, contexts) {
                q.ifError(err);
                q.equal(2, contexts.length);
                if (UPDATE) fs.writeFileSync(__dirname + '/fixtures/context-vt-light.json', JSON.stringify(contexts, null, 4));
                q.deepEqual(require(__dirname + '/fixtures/context-vt-light.json'), contexts);
                q.end();
            });
        });
    });
});

test('context utf', function(t) {
    var geocoder = new Carmen({
        country: Carmen.auto(__dirname + '/fixtures/01-ne.country.utf.s3')
    });

    geocoder._open(function() {
        t.test('context utf full', function(q) {
            context(geocoder, 0, 40, null, true, function(err, contexts) {
                q.ifError(err);
                q.equal(1, contexts.length);
                if (UPDATE) fs.writeFileSync(__dirname + '/fixtures/context-utf-full.json', JSON.stringify(contexts, null, 4));
                q.deepEqual(require(__dirname + '/fixtures/context-utf-full.json'), contexts);
                q.end();
            });
        });
        t.test('context utf light', function(q) {
            context(geocoder, 0, 40, null, false, function(err, contexts) {
                q.ifError(err);
                q.equal(1, contexts.length);
                if (UPDATE) fs.writeFileSync(__dirname + '/fixtures/context-utf-light.json', JSON.stringify(contexts, null, 4));
                q.deepEqual(require(__dirname + '/fixtures/context-utf-light.json'), contexts);
                q.end();
            });
        });
    });
});

test('contextVector deflate', function(t) {
    var source = {
        getTile: function(z,x,y,callback) {
            return callback(null, fs.readFileSync(__dirname + '/fixtures/0.0.0.vector.pbf'), {
                'content-type': 'application/x-protobuf',
                'content-encoding': 'deflate'
            });
        },
        _geocoder: {
            geocoder_layer: 'data',
            maxzoom: 0,
            minzoom: 0,
            name: 'test',
            id: 'testA',
            idx: 1
        }
    };
    context.contextVector(source, -97.4707, 39.4362, false, function(err, data) {
        t.ifError(err);
        t.deepEqual(data, {
            _extid: 'test.5',
            _tmpid: 100000005,
            _text: 'United States of America, United States, America, USA, US'
        });
        t.end();
    });
});

test('contextVector gzip', function(t) {
    var source = {
        getTile: function(z,x,y,callback) {
            return callback(null, fs.readFileSync(__dirname + '/fixtures/0.0.0.vector.pbfz'), {
                'content-type': 'application/x-protobuf',
                'content-encoding': 'gzip'
            });
        },
        _geocoder: {
            geocoder_layer: 'data',
            maxzoom: 0,
            minzoom: 0,
            name: 'test',
            id: 'testA',
            idx: 1
        }
    };
    context.contextVector(source, -97.4707, 39.4362, false, function(err, data) {
        t.ifError(err);
        t.deepEqual(data, {
            _extid: 'test.5',
            _tmpid: 100000005,
            _text: 'United States of America, United States, America, USA, US'
        });
        t.end();
    });
});

test('contextVector badbuffer', function(t) {
    var source = {
        getTile: function(z,x,y,callback) {
            return callback(null, new Buffer('lkzvjlkajsdf'));
        },
        _geocoder: {
            geocoder_layer: 'data',
            maxzoom: 0,
            minzoom: 0,
            name: 'test',
            id: 'testA'
        }
    };
    context.contextVector(source, -97.4707, 39.4362, false, function(err, data) {
        t.equal(err.toString(), 'Error: Could not detect compression of vector tile');
        t.end();
    });
});

test('contextVector ignores negative score', function(assert) {
    var vtile = new mapnik.VectorTile(0,0,0);
    vtile.addGeoJSON(JSON.stringify({
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": { "type": "Point", "coordinates": [ 0,0 ] },
                "properties": { "_text": "A", "_score": -1 }
            },
            {
                "type": "Feature",
                "geometry": { "type": "Point", "coordinates": [ 0,0 ] },
                "properties": { "_text": "B" }
            }
        ]
    }),"data");
    zlib.gzip(vtile.getData(), function(err, buffer) {
        assert.ifError(err);
        var source = {
            getTile: function(z,x,y,callback) {
                return callback(null, buffer);
            },
            _geocoder: {
                geocoder_layer: 'data',
                maxzoom: 0,
                minzoom: 0,
                name: 'test',
                id: 'testA'
            }
        };
        context.contextVector(source, 0, 0, false, function(err, data) {
            assert.ifError(err);
            assert.equal(data._text, 'B');
            assert.end();
        });
    });
});

test('contextVector reverse Cluster', function(assert) {
        var address = new mem({
            format: 'pbf',
            geocoder_layer: 'data',
            geocoder_shardlevel: 0,
            geocoder_address: 1,
            name: 'address',
            id: 'address',
            maxzoom: 14,
        }, function() {});
        address._geocoder = address._info;

    var vtile = new mapnik.VectorTile(14,3640,5670);
    vtile.addGeoJSON(JSON.stringify({
            "type": "LineString",
            "coordinates": [[ -100.00605583190918,48.36314970496242],[-100.00185012817383,48.36640011246755]],
            "properties": {
                _id: 1,
                _text:'fake street',
                _center: [-100.00605583190918,48.36314970496242],
                _cluster: {
                    9: { type: "Point", coordinates: [-100.00605583190918,48.36314970496242] },
                    10: { type: "Point", coordinates: [-100.00185012817383,48.36640011246755] }
                }
            }
        }), "address");

    zlib.gzip(vtile.getData(), function(err, buffer) {
        assert.ifError(err);

        address.putTile(14,3640,5670, buffer , function() {
            context.contextVector(address, -100.00185012817383, 48.36640011246755, true, function(err, data) {
                assert.ifError(err);
                console.log(data)
                assert.end();
            });
        })
    });
});
