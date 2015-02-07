var fs = require('fs');
var util = require('util');
var Carmen = require('..');
var S3 = require('tilelive-s3');
var index = require('../lib/index');
var feature = require('../lib/util/feature');
var memFixture = require('./fixtures/mem.json');
var mem = require('../lib/api-mem');
var UPDATE = process.env.UPDATE;
var test = require('tape');

test('index', function(t) {
    var country = new S3(__dirname + '/fixtures/01-ne.country.bounds.s3', function(err, source) {
        if (err) t.fail();
    });
    var countrySource = new mem(null, {}, function() {});
    countrySource.getIndexableDocs = function(pointer, callback) {
        mem.prototype.getIndexableDocs.call(this, pointer, function(err, docs, pointer) {
            if (err) return callback(err);
            docs = docs.filter(function(d) { return d._center[0] < 0 });
            return callback(null, docs, pointer);
        });
    };
    t.skip('indexes country', function(q) {
        this.timeout(60e3);
        var c = new Carmen({ country:country, countrySource:countrySource });
        c.index(countrySource, country, {}, function(err) {
            q.ifError(err);
            feature.getAllFeatures(country, function(err, features) {
                q.ifError(err);
                q.end();
            });
        });
    });
    t.test('queries outside boundary', function(q) {
        var c = new Carmen({
            country: country
        });
        c.geocode('-77.022472,38.930062', {}, function(err, res) {
            q.ifError(err);
            q.equal(res.features.length, 0);
            q.end();
        });
    });
    t.end();
});
