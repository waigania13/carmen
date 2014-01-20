var fs = require('fs');
var assert = require('assert');
var Locking = require('../lib/util/locking');

describe('locking IO', function() {
    it('avoids multiple IO calls', function(done) {
        var stats = {
            a: { once: 0, many: 0 },
            b: { once: 0, many: 0 }
        };
        var remaining = 10;
        for (var i = 0; i < 4; i++) {
            var lock = Locking('a', function(err, data) {
                stats.a.many++;
                assert.ifError(err);
                assert.ok(data);
                if (--remaining === 0) {
                    assert.equal(1, stats.a.once);
                    assert.equal(4, stats.a.many);
                    done();
                }
            });
            lock(function(callback) {
                stats.a.once++;
                fs.readFile(__dirname + '/../package.json', 'utf8', callback);
            });
        }
        for (var i = 0; i < 6; i++) {
            var lock = Locking('b', function(err, data) {
                stats.b.many++;
                assert.ifError(err);
                assert.ok(data);
                if (--remaining === 0) {
                    assert.equal(1, stats.b.once);
                    assert.equal(6, stats.b.many);
                    done();
                }
            });
            lock(function(callback) {
                stats.b.once++;
                fs.readFile(__dirname + '/../package.json', 'utf8', callback);
            });
        }
    });
    it('completes multiple callbacks', function(done) {
        var url = __dirname + '/../package.json';
        var stats = { once: 0, many: 0 };
        var remaining = 4;
        for (var i = 0; i < 4; i++) {
            var callback = function(err, data) {
                stats.many++;
                assert.ifError(err);
                if (--remaining === 0) {
                    assert.equal(4, stats.many);
                    done();
                }
            };
            var lock = Locking(url, function(err, data) {
                assert.ifError(err);
                assert.ok(data);
                return callback(null, data);
            });
            lock(function(callback) {
                stats.once++;
                fs.readFile(url, 'utf8', function(err, buffer) {
                    if (err) return callback(err);
                    try { var data = JSON.parse(buffer); }
                    catch(err) { return callback(err); }
                    callback(null, data)
                });
            });
        }
    });
    it('completes multiple callbacks asynchronously', function(done) {
        var url = __dirname + '/../package.json';
        var stats = { once: 0, many: 0 };
        var once = function(callback) {
            stats.once++;
            fs.readFile(url, 'utf8', function(err, buffer) {
                if (err) return callback(err);
                try { var data = JSON.parse(buffer); }
                catch(err) { return callback(err); }
                callback(null, data);
            });
        };
        var lock = function(callback) {
            return Locking(url, function(err, data) {
                stats.many++;
                assert.ifError(err);
                assert.ok(data);
                callback();
            })(once);
        };
        lock(function() {
            lock(function() {
                assert.equal(2, stats.many);
                done();
            });
        });
    });
});

