var fs = require('fs');
var assert = require('assert');
var util = require('util');
var Carmen = require('..');
var tilelive = require('tilelive');
var context = require('../lib/context');
var UPDATE = process.env.UPDATE;

describe('context vector', function() {
    var geocoder = new Carmen({
        country: Carmen.auto(__dirname + '/fixtures/01-ne.country.s3'),
        province: Carmen.auto(__dirname + '/fixtures/02-ne.province.s3')
    });
    before(function(done) {
        geocoder._open(done);
    });
    it ('context vt full', function(done) {
        context(geocoder, 0, 40, null, true, function(err, contexts) {
            assert.ifError(err);
            assert.equal(2, contexts.length);
            if (UPDATE) fs.writeFileSync(__dirname + '/fixtures/context-vt-full.json', JSON.stringify(contexts, null, 4));
            assert.deepEqual(require(__dirname + '/fixtures/context-vt-full.json'), contexts);
            done();
        });
    });
    it ('context vt light', function(done) {
        context(geocoder, 0, 40, null, false, function(err, contexts) {
            assert.ifError(err);
            assert.equal(2, contexts.length);
            if (UPDATE) fs.writeFileSync(__dirname + '/fixtures/context-vt-light.json', JSON.stringify(contexts, null, 4));
            assert.deepEqual(require(__dirname + '/fixtures/context-vt-light.json'), contexts);
            done();
        });
    });
});

describe('context utf', function() {
    var geocoder = new Carmen({
        country: Carmen.auto(__dirname + '/fixtures/01-ne.country.utf.s3')
    });
    before(function(done) {
        geocoder._open(done);
    });
    it ('context utf full', function(done) {
        context(geocoder, 0, 40, null, true, function(err, contexts) {
            assert.ifError(err);
            assert.equal(1, contexts.length);
            if (UPDATE) fs.writeFileSync(__dirname + '/fixtures/context-utf-full.json', JSON.stringify(contexts, null, 4));
            assert.deepEqual(require(__dirname + '/fixtures/context-utf-full.json'), contexts);
            done();
        });
    });
    it ('context utf light', function(done) {
        context(geocoder, 0, 40, null, false, function(err, contexts) {
            assert.ifError(err);
            assert.equal(1, contexts.length);
            if (UPDATE) fs.writeFileSync(__dirname + '/fixtures/context-utf-light.json', JSON.stringify(contexts, null, 4));
            assert.deepEqual(require(__dirname + '/fixtures/context-utf-light.json'), contexts);
            done();
        });
    });
});

