#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var argv = process.argv;
var api = {
    '.s3': require('../api-s3'),
    '.mbtiles': require('../api-mbtiles')
};
var Carmen = require('../index.js');
var Queue = require('../queue');
var _ = require('underscore');
var f = argv[2];

if (!f) {
    console.warn('Usage: carmen-verify.js <file>');
    process.exit(1);
}
if (!fs.existsSync(f)) {
    console.warn('File %s does not exist.', f);
    process.exit(1);
}
if (!api[path.extname(f)]) {
    console.warn('File %s format not recognized.', f);
    process.exit(1);
}

console.log('Verifying %s ...', f);

var s = new api[path.extname(f)](f, function() {});
var carmen = new Carmen({ s: s });
var stats = {};

carmen._open(function(err) {
    if (err) throw err;
    var shardlevel = s._geocoder.shardlevel;

    function checkall(from, to, i, stats, callback) {
        stats = stats || [ 0, 0 ];

        if (i === Math.pow(16, shardlevel)) return callback(null, stats);

        s.getCarmen(from, i, function(err, buffer) {
            if (err) return callback(err);
            s._geocoder.load(buffer || new Buffer(0), from, i);
            var ids = s._geocoder.list(from, i);
            stats[0] += ids.length;
            (function check() {
                if (!ids.length) return checkall(from, to, ++i, stats, callback);
                var fromid = +ids.shift();
                var toids = s._geocoder.search(from, +i, fromid);
                if (from === 'degen') toids = toids.map(function(v) { return Math.floor(v/4); });
                stats[1] += toids.length;
                s._geocoder.getall(s.getCarmen.bind(s), to, toids, function(err, res) {
                    if (err) return callback(err);
                    if (!res.length) console.warn('%s %s =x %s %s', from, fromid, to, toids);
                    process.nextTick(function() { check() });
                });
            })();
        });
    };

    checkall('term', 'phrase', 0, null, function(err, stats) {
        if (err) throw err;
        console.log('Verified %d phrases referred to by %d terms', stats[1], stats[0]);
        checkall('term', 'grid', 0, null, function(err, stats) {
            if (err) throw err;
            console.log('Verified %d grids referred to by %d terms', stats[1], stats[0]);
            checkall('phrase', 'freq', 0, null, function(err, stats) {
                if (err) throw err;
                console.log('Verified %d freqs referred to by %d phrases', stats[1], stats[0]);
            });
        });
    });
});

