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
    it ('proximity geocoding', function(done) {
        geocoder.geocode('saint john', {}, function(err, res) {
            assert.ifError(err);
            if (UPDATE) fs.writeFileSync(__dirname + '/fixtures/geocode-without-proximity.json', JSON.stringify(res, null, 4));
            assert.equal(res.features[0].place_name, require(__dirname + '/fixtures/geocode-without-proximity.json').features[0].place_name, res);
            geocoder.geocode('saint john', { proximity: [13.177876,-59.504401]}, function(err, res) {
                assert.ifError(err);
                if (UPDATE) fs.writeFileSync(__dirname + '/fixtures/geocode-with-proximity.json', JSON.stringify(res, null, 4));
                assert.equal(res.features[0].place_name, require(__dirname + '/fixtures/geocode-with-proximity.json').features[0].place_name, res);
                done();
            });
        });
    });
    it ('string proximity geocoding', function(done) {
        geocoder.geocode('saint john', { proximity: "13.177876, -59.504401"}, function(err, res) {
            assert.ifError(err);
            if (UPDATE) fs.writeFileSync(__dirname + '/fixtures/geocode-with-proximity.json', JSON.stringify(res, null, 4));
            assert.equal(res.features[0].place_name, require(__dirname + '/fixtures/geocode-with-proximity.json').features[0].place_name, res);
            done();
        });
    });
    it ('string proximity geocoding', function(done) {
        geocoder.geocode('n korea', { proximity: "13.177876"}, function(err, res) {
            assert.ifError(!err);
            done();
        });
    });
    it ('invalid proximity length', function(done) {
            geocoder.geocode('saint john', { proximity: [98.177876]}, function(err, res) {    
                assert.ifError(!err);
                done();
            });
    });
    it ('invalid proximity lat', function(done) {
            geocoder.geocode('n korea', { proximity: [98.177876,-59.504401]}, function(err, res) {
                assert.ifError(!err);
                done();
            });
    });
    it ('invalid proximity lon', function(done) {
            geocoder.geocode('new york', { proximity: [58.177876,-200.504401]}, function(err, res) {
                assert.ifError(!err);
                done();
            });
    });
    it ('text in proximity field', function(done) {
            geocoder.geocode('usa', { proximity: ["58d.177876","-200.5044s01"]}, function(err, res) {
                assert.ifError(!err);
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
