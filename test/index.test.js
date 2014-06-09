var fs = require('fs');
var assert = require('assert');
var util = require('util');
var Carmen = require('..');
var index = require('../lib/index');
var memFixture = require('./fixtures/mem.json');
var MBTiles = require('mbtiles'),
    mem = require('../lib/api-mem');
var UPDATE = process.env.UPDATE;

describe('index.update', function() {
    var to = new mem(null, function() {});
    var carmen = new Carmen({ to: to });
    it('error no _id', function(done) {
        index.update(to, [{_text:'main st'}], function(err) {
            assert.equal('Error: doc has no _id', err.toString());
            done();
        });
    });
    it('error no _zxy', function(done) {
        index.update(to, [{_text:'main st',_id:1}], function(err) {
            assert.equal('Error: doc has no _zxy', err.toString());
            done();
        });
    });
    it('error no _zxy (empty array)', function(done) {
        index.update(to, [{_text:'main st',_id:1,_zxy:[]}], function(err) {
            assert.equal('Error: doc has no _zxy', err.toString());
            done();
        });
    });
    it('error no _center', function(done) {
        index.update(to, [{_text:'main st',_id:1,_zxy:['0/0/0']}], function(err) {
            assert.equal('Error: doc has no _center', err.toString());
            done();
        });
    });
    it('indexes single doc', function(done) {
        index.update(to, [{_text:'main st',_id:1,_zxy:['0/0/0'],_center:[0,0]}], function(err) {
            assert.ifError(err);
            done();
        });
    });
});

describe('index', function() {
    var from = new mem(null, function() {});
    var to = new mem(null, function() {});
    var carmen = new Carmen({
        from: from,
        to: to
    });
    it('indexes a document', function(done) {
        carmen.index(from, to, {}, function(err) {
            assert.ifError(err);
            // Updates the mem.json fixture on disk.
            if (UPDATE) fs.writeFileSync(__dirname + '/fixtures/mem.json', JSON.stringify(to.serialize(), null, 4));
            assert.deepEqual(to.serialize(), memFixture);
            done();
        });
    });
    it('verifies index', function(done) {
        carmen.verify(to, function(err, stats) {
            assert.ifError(err);
            assert.deepEqual({ relation: [ 'term', 'phrase' ], count: [ 261, 265 ] }, stats[0]);
            assert.deepEqual({ relation: [ 'term', 'grid' ], count: [ 261, 265 ] }, stats[1]);
            assert.deepEqual({ relation: [ 'phrase', 'freq' ], count: [ 265, 410 ] }, stats[2]);
            done();
        });
    });
    it('analyzes index', function(done) {
        carmen.analyze(to, function(err, stats) {
            assert.ifError(err);
            // Updates the mem-analyze.json fixture on disk.
            if (UPDATE) fs.writeFileSync(__dirname + '/fixtures/mem-analyze.json', JSON.stringify(stats, null, 4));
            assert.deepEqual(require('./fixtures/mem-analyze.json'), stats);
            done();
        });
    });
    it('loadall index', function(done) {
        to._geocoder.unloadall('degen');
        to._geocoder.unloadall('term');
        to._geocoder.unloadall('phrase');
        to._geocoder.unloadall('grid');
        assert.ok(!to._geocoder.has('degen', 0));
        assert.ok(!to._geocoder.has('term', 0));
        assert.ok(!to._geocoder.has('phrase', 0));
        assert.ok(!to._geocoder.has('grid', 0));
        carmen.loadall(to, 1, function(err) {
            assert.ifError(err);
            assert.ok(to._geocoder.has('degen', 0));
            assert.ok(to._geocoder.has('term', 0));
            assert.ok(to._geocoder.has('phrase', 0));
            assert.ok(to._geocoder.has('grid', 0));
            done();
        });
    });
    it('wipes index', function(done) {
        carmen.wipe(to, function(err) {
            assert.ifError(err);
            carmen.verify(to, function(err, stats) {
                assert.deepEqual({
                    freq: { '0': '' },
                    term: { '0': '' },
                    phrase: { '0': '' },
                    grid: { '0': '' },
                    degen: { '0': '' },
                    feature: { '0': '{}', '1':'{}', '2':'{}', '3':'{}' }
                }, to.serialize().shards);
                done();
            });
        });
    });
});
