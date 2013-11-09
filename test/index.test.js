var _ = require('underscore');
var fs = require('fs');
var assert = require('assert');
var util = require('util');
var Carmen = require('..');
var memFixture = require('./fixtures/mem.json');
var MBTiles = require('../api-mbtiles'),
    mem = require('../api-mem');

describe('index', function() {
    var from = new MBTiles(__dirname + '/../tiles/01-ne.country.mbtiles', function(){});
    var to = new mem(null, function() {});
    var carmen = new Carmen({
        from: from,
        to: to
    });
    before(function(done) {
        carmen._open(done);
    });
    it('indexes a document', function(done) {
        to.startWriting(function(err) {
            if (err) throw err;
            var index = function(pointer) {
                from.getIndexableDocs(pointer, function(err, docs, pointer) {
                    if (err) throw err;
                    var start;
                    if (!docs.length) {
                        return carmen.store(to, function(err) {
                            if (err) throw err;
                            to.stopWriting(function(err) {
                                if (err) throw err;
                                // Updates the mem.json fixture on disk.
                                // fs.writeFileSync(__dirname + '/fixtures/mem.json', JSON.stringify(to.serialize(), null, 4));
                                assert.deepEqual(to.serialize(), memFixture);
                                done();
                            });
                        });
                    }
                    start = +new Date();
                    carmen.index(to, docs, function(err) {
                        if (err) throw err;
                        index(pointer);
                    });
                });
            };
            index({nogrids:false});
        });
    });
    it('verifies index', function(done) {
        carmen.verify(to, function(err, stats) {
            assert.ifError(err);
            assert.deepEqual({ relation: [ 'term', 'phrase' ], count: [ 275, 286 ] }, stats[0]);
            assert.deepEqual({ relation: [ 'term', 'grid' ], count: [ 275, 286 ] }, stats[1]);
            assert.deepEqual({ relation: [ 'phrase', 'freq' ], count: [ 265, 410 ] }, stats[2]);
            done();
        });
    });
    it('analyzes index', function(done) {
        carmen.analyze(to, function(err, stats) {
            assert.ifError(err);
            assert.deepEqual(require('./fixtures/mem-analyze.json'), stats);
            done();
        });
    });
});
