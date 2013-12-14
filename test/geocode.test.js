var _ = require('underscore');
var fs = require('fs');
var assert = require('assert');
var util = require('util');
var Carmen = require('..');

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
            fs.writeFileSync(__dirname + '/fixtures/geocode-forward.json', JSON.stringify(res, null, 4));
            assert.deepEqual(require(__dirname + '/fixtures/geocode-forward.json'), res);
            done();
        });
    });
    it ('reverse', function(done) {
        geocoder.geocode('0, 40', {}, function(err, res) {
            assert.ifError(err);
            fs.writeFileSync(__dirname + '/fixtures/geocode-reverse.json', JSON.stringify(res, null, 4));
            assert.deepEqual(require(__dirname + '/fixtures/geocode-reverse.json'), res);
            done();
        });
    });
});
