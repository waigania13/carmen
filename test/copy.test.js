var fs = require('fs');
var assert = require('assert');
var util = require('util');
var Carmen = require('..');
var memFixture = require('./fixtures/mem.json');
var MBTiles = require('mbtiles');
var mem = require('../lib/api-mem');
var index = require('../lib/index');
var mem = require('../lib/api-mem');
var docs = require('./fixtures/docs.json');

describe('copy', function() {
    var from = new mem(null, function() {});
    var to = new mem(null, function() {});
    var carmen = new Carmen({
        from: from,
        to: to
    });

    before(function(done) {
        index.update(from, docs, function(err) {
            if (err) return done(err);
            index.store(from, done);
        });
    });

    it('blank', function(done) {
        carmen.verify(to, function(err, stats) {
            assert.deepEqual({ relation: [ 'term', 'phrase' ], count: [ 0, 0 ] }, stats[0]);
            assert.deepEqual({ relation: [ 'term', 'grid' ], count: [ 0, 0 ] }, stats[1]);
            assert.deepEqual({ relation: [ 'phrase', 'freq' ], count: [ 0, 0 ] }, stats[2]);
            done();
        });
    });
    it('copies', function(done) {
        carmen.copy(from, to, function(err) {
            assert.ifError(err);
            assert.deepEqual(to.serialize(), memFixture);
            done();
        });
    });
    it('verifies copy', function(done) {
        carmen.verify(to, function(err, stats) {
            assert.ifError(err);
            assert.deepEqual({ relation: [ 'term', 'phrase' ], count: [ 261, 265 ] }, stats[0]);
            assert.deepEqual({ relation: [ 'term', 'grid' ], count: [ 261, 265 ] }, stats[1]);
            assert.deepEqual({ relation: [ 'phrase', 'freq' ], count: [ 265, 410 ] }, stats[2]);
            done();
        });
    });
});
