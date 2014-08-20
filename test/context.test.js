var fs = require('fs');
var util = require('util');
var Carmen = require('..');
var tilelive = require('tilelive');
var context = require('../lib/context');
var UPDATE = process.env.UPDATE;
var test = require('tape');

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
            id: 'test'
        }
    };
    context.contextVector(source, -97.4707, 39.4362, false, function(err, data) {
        t.ifError(err);
        t.deepEqual(data, {
            _extid: 'test.5',
            _fhash: 'test.5',
            _text: 'United States of America, United States, America, USA, US'
        });
        t.end();
    });
});

test.skip('contextVector gzip', function(t) {
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
            id: 'test'
        }
    };
    context.contextVector(source, -97.4707, 39.4362, false, function(err, data) {
        t.ifError(err);
        t.deepEqual(data, {
            _extid: 'test.5',
            _fhash: 'test.5',
            _text: 'United States of America, United States, America, USA, US'
        });
        t.end();
    });
});

