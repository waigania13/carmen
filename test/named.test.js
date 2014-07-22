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
    var east = new S3(__dirname + '/fixtures/01-ne.country.east.s3', function(err, source) {
        if (err) t.fail();
    });
    var west = new S3(__dirname + '/fixtures/01-ne.country.west.s3', function(err, source) {
        if (err) t.fail();
    });
    var eastSource = new mem(null, function() {});
    var westSource = new mem(null, function() {});
    eastSource.getIndexableDocs = function(pointer, callback) {
        mem.prototype.getIndexableDocs.call(this, pointer, function(err, docs, pointer) {
            if (err) return callback(err);
            docs = docs.filter(function(d) { return d._center[0] >= 0 });
            return callback(null, docs, pointer);
        });
    };
    westSource.getIndexableDocs = function(pointer, callback) {
        mem.prototype.getIndexableDocs.call(this, pointer, function(err, docs, pointer) {
            if (err) return callback(err);
            docs = docs.filter(function(d) { return d._center[0] < 0 });
            return callback(null, docs, pointer);
        });
    };
    t.skip('indexes east', function(q) {
        this.timeout(60e3);
        var c = new Carmen({ east:east, eastSource:eastSource });
        c.index(eastSource, east, {}, function(err) {
            q.ifError(err);
            feature.getAllFeatures(east, function(err, features) {
                q.ifError(err);
                q.equal(features.length, 164);
                q.end();
            });
        });
    });
    t.skip('indexes west', function(q) {
        this.timeout(60e3);
        var c = new Carmen({ west:west, westSource:westSource });
        c.index(westSource, west, {}, function(err) {
            q.ifError(err);
            feature.getAllFeatures(west, function(err, features) {
                q.ifError(err);
                q.equal(features.length, 89);
                q.end();
            });
        });
    });
    t.test('queries east as country', function(q) {
        var c = new Carmen({
            east: east,
            west: west
        });
        c.geocode('china', {}, function(err, res) {
            q.ifError(err);
            q.equal(res.features.length, 1);
            q.equal(res.features[0].id, 'country.3');
            q.end();
        });
    });
    t.test('queries west as country', function(q) {
        var c = new Carmen({
            east: east,
            west: west
        });
        c.geocode('brazil', {}, function(err, res) {
            q.ifError(err);
            q.equal(res.features.length, 1);
            q.equal(res.features[0].id, 'country.7');
            q.end();
        });
    });
    t.end();
});

