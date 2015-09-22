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
            index.store(from, function() {
                q.end();
            });
        });
    });

    t.test('blank', function(q) {
        carmen.analyze(to, function(err, stats) {
            q.ifError(err);
            q.deepEqual(stats, {
                byRelev: { '0.4': 0, '0.6': 0, '0.8': 0, '1.0': 0 },
                byScore: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
                degen: 0,
                ender: 0,
                total: 0
            });
            q.end();
        });
    });

    t.test('copies', function(q) {
        carmen.copy(from, to, function(err) {
            q.ifError(err);
            q.deepEqual(JSON.stringify(to.serialize()).length, JSON.stringify(memFixture).length);
            q.end();
        });
    });

    t.test('analyzes copy', function(q) {
        carmen.analyze(to, function(err, stats) {
            q.ifError(err);
            q.deepEqual(require('./fixtures/mem-analyze.json'), stats);
            q.end();
        });
    });

    t.test('index.teardown', function(assert) {
        index.teardown();
        assert.end();
    });

    t.end();
});

// Tests copy @ shardlevel 5
test.skip('copy (shardlevel=5)', function(t) {
    var from = new mem({geocoder_shardlevel:5}, function() {});
    var to = new mem({geocoder_shardlevel:5}, function() {});
    var carmen = new Carmen({
        from: from,
        to: to
    });
    var zoom = 6;

    t.test('update', function(q) {
        index.update(from, docs, zoom, function(err) {
            if (err) q.fail();
            index.store(from, function() {
                q.end();
            });
        });
    });

    t.test('blank', function(q) {
        carmen.analyze(to, function(err, stats) {
            q.ifError(err);
            q.deepEqual(stats, {
                byRelev: { '0.4': 0, '0.6': 0, '0.8': 0, '1.0': 0 },
                byScore: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
                degen: 0,
                ender: 0,
                total: 0
            });
            q.end();
        });
    });

    t.test('copies', function(q) {
        carmen.copy(from, to, function(err) {
            q.ifError(err);
            q.end();
        });
    });

    t.test('index.teardown', function(assert) {
        index.teardown();
        assert.end();
    });

    t.end();
});

