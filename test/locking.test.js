var fs = require('fs');
var Locking = require('../lib/util/locking');
var test = require('tape');

test('avoids multiple IO calls', function(t) {
    var stats = {
        a: { once: 0, many: 0 },
        b: { once: 0, many: 0 }
    };
    var remaining = 10;
    for (var i = 0; i < 4; i++) {
        var lock = Locking('a', function(err, data) {
            stats.a.many++;
            t.ifError(err);
            t.ok(data);
            if (--remaining === 0) {
                t.equal(1, stats.a.once);
                t.equal(4, stats.a.many);
                t.end();
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
            t.ifError(err);
            t.ok(data);
            if (--remaining === 0) {
                t.equal(1, stats.b.once);
                t.equal(6, stats.b.many);
                t.end();
            }
        });
        lock(function(callback) {
            stats.b.once++;
            fs.readFile(__dirname + '/../package.json', 'utf8', callback);
        });
    }
});

test('completes multiple callbacks', function(t) {
    var url = __dirname + '/../package.json';
    var stats = { once: 0, many: 0 };
    var remaining = 4;
    for (var i = 0; i < 4; i++) {
        var callback = function(err, data) {
            stats.many++;
            t.ifError(err);
            if (--remaining === 0) {
                t.equal(4, stats.many);
                t.end();
            }
        };
        var lock = Locking(url, function(err, data) {
            t.ifError(err);
            t.ok(data);
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

test('completes multiple callbacks asynchronously', function(t) {
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
            t.ifError(err);
            t.ok(data);
            callback();
        })(once);
    };
    lock(function() {
        lock(function() {
            t.equal(2, stats.many);
            t.end();
        });
    });
});

