var fs = require('fs');
var assert = require('assert');
var util = require('util');
var Carmen = require('..');
var S3 = require('tilelive-s3');
var index = require('../lib/index');
var feature = require('../lib/util/feature');
var memFixture = require('./fixtures/mem.json');
var mem = require('../lib/api-mem');
var UPDATE = process.env.UPDATE;

describe('index', function() {
    var east = new S3(__dirname + '/fixtures/01-ne.country.east.s3');
    var west = new S3(__dirname + '/fixtures/01-ne.country.west.s3');
//    var eastSource = new mem(null, function() {});
//    var westSource = new mem(null, function() {});
//    eastSource.getIndexableDocs = function(pointer, callback) {
//        mem.prototype.getIndexableDocs.call(this, pointer, function(err, docs, pointer) {
//            if (err) return callback(err);
//            docs = docs.filter(function(d) { return d._center[0] >= 0 });
//            return callback(null, docs, pointer);
//        });
//    };
//    westSource.getIndexableDocs = function(pointer, callback) {
//        mem.prototype.getIndexableDocs.call(this, pointer, function(err, docs, pointer) {
//            if (err) return callback(err);
//            docs = docs.filter(function(d) { return d._center[0] < 0 });
//            return callback(null, docs, pointer);
//        });
//    };
//    it.skip('indexes east', function(done) {
//        this.timeout(60e3);
//        var c = new Carmen({ east:east, eastSource:eastSource });
//        c.index(eastSource, east, {}, function(err) {
//            assert.ifError(err);
//            feature.getAllFeatures(east, function(err, features) {
//                assert.ifError(err);
//                assert.equal(features.length, 164);
//                done();
//            });
//        });
//    });
//    it.skip('indexes west', function(done) {
//        this.timeout(60e3);
//        var c = new Carmen({ west:west, westSource:westSource });
//        c.index(westSource, west, {}, function(err) {
//            assert.ifError(err);
//            feature.getAllFeatures(west, function(err, features) {
//                assert.ifError(err);
//                assert.equal(features.length, 89);
//                done();
//            });
//        });
//    });
    it('queries east as country', function(done) {
        var c = new Carmen({
            east: east,
            west: west
        });
        c.geocode('china', {}, function(err, res) {
            assert.ifError(err);
            assert.equal(res.features.length, 1);
            assert.equal(res.features[0].id, 'country.3');
            done();
        });
    });
    it('queries west as country', function(done) {
        var c = new Carmen({
            east: east,
            west: west
        });
        c.geocode('brazil', {}, function(err, res) {
            assert.ifError(err);
            assert.equal(res.features.length, 1);
            assert.equal(res.features[0].id, 'country.7');
            done();
        });
    });
});

