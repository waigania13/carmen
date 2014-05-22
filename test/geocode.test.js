var fs = require('fs');
var assert = require('assert');
var util = require('util');
var Carmen = require('..');
var UPDATE = process.env.UPDATE;

describe('geocode', function() {
    var geocoder = new Carmen({
        country: Carmen.auto(__dirname + '/fixtures/01-ne.country.s3'),
        province: Carmen.auto(__dirname + '/fixtures/02-ne.province.s3')
    });
    before(function(done) {
        geocoder._open(done);
    });
    it ('forward', function(done) {
        geocoder.geocode('georgia', {}, function(err, res) {
            assert.ifError(err);
            if (UPDATE) fs.writeFileSync(__dirname + '/fixtures/geocode-forward.json', JSON.stringify(res, null, 4));
            assert.deepEqual(require(__dirname + '/fixtures/geocode-forward.json'), res);
            done();
        });
    });
    it ('forward + by id', function(done) {
        geocoder.geocode('country.38', {}, function(err, res) {
            assert.ifError(err);
            if (UPDATE) fs.writeFileSync(__dirname + '/fixtures/search-ident.json', JSON.stringify(res, null, 4));
            assert.deepEqual(require(__dirname + '/fixtures/search-ident.json'), res);
            done();
        });
    });
    it ('forward + geocoder_tokens', function(done) {
        geocoder.geocode('n korea', {}, function(err, res) {
            assert.ifError(err);
            if (UPDATE) fs.writeFileSync(__dirname + '/fixtures/geocode-forward-tokens.json', JSON.stringify(res, null, 4));
            assert.deepEqual(require(__dirname + '/fixtures/geocode-forward-tokens.json'), res);
            done();
        });
    });
    it ('reverse', function(done) {
        geocoder.geocode('0, 40', {}, function(err, res) {
            assert.ifError(err);
            if (UPDATE) fs.writeFileSync(__dirname + '/fixtures/geocode-reverse.json', JSON.stringify(res, null, 4));
            assert.deepEqual(require(__dirname + '/fixtures/geocode-reverse.json'), res);
            done();
        });
    });
    it ('noresults', function(done) {
        geocoder.geocode('asdfasdf', {}, function(err, res) {
            assert.ifError(err);
            if (UPDATE) fs.writeFileSync(__dirname + '/fixtures/geocode-noresults.json', JSON.stringify(res, null, 4));
            assert.deepEqual(require(__dirname + '/fixtures/geocode-noresults.json'), res);
            done();
        });
    });
});
