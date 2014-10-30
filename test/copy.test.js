var fs = require('fs');
var util = require('util');
var Carmen = require('..');
var memFixture = require('./fixtures/mem.json');
var MBTiles = require('mbtiles');
var mem = require('../lib/api-mem');
var index = require('../lib/index');
var mem = require('../lib/api-mem');
var docs = require('./fixtures/docs.json');
var test = require('tape');

test('copy', function(t) {
    var from = new mem(null, function() {});
    var to = new mem(null, function() {});
    var carmen = new Carmen({
        from: from,
        to: to
    });
    var zoom = 6;

    t.test('update', function(q) {
        index.update(from, docs, zoom, function(err) {
            if (err) q.fail();
            index.store(from, function(){
                q.end();
            });
        });
    });

    t.test('blank', function(q) {
        carmen.verify(to, function(err, stats) {
            q.deepEqual({ relation: [ 'term', 'phrase' ], count: [ 0, 0 ] }, stats[0]);
            q.deepEqual({ relation: [ 'term', 'grid' ], count: [ 0, 0 ] }, stats[1]);
            q.deepEqual({ relation: [ 'phrase', 'freq' ], count: [ 0, 0 ] }, stats[2]);
            q.end();
        });
    });

    t.test('copies', function(q) {
        carmen.copy(from, to, function(err) {
            q.ifError(err);
            q.deepEqual(to.serialize(), memFixture);
            q.end();
        });
    });

    t.test('verifies copy', function(q) {
        carmen.verify(to, function(err, stats) {
            q.ifError(err);
            q.deepEqual({ relation: [ 'term', 'phrase' ], count: [ 261, 265 ] }, stats[0]);
            q.deepEqual({ relation: [ 'term', 'grid' ], count: [ 261, 265 ] }, stats[1]);
            q.deepEqual({ relation: [ 'phrase', 'freq' ], count: [ 265, 410 ] }, stats[2]);
            q.end();
        });
    });

    t.end();
});
