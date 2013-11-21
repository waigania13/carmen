#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var argv = process.argv;
var api = {
    '.s3': require('../api-s3'),
    '.mbtiles': require('../api-mbtiles')
};
var Carmen = require('../index.js');
var queue = require('queue-async');
var f = argv[2];
var t = argv[3];

[f,t].forEach(function(f) {
    if (!f) {
        console.warn('Usage: carmen-copy.js <from> <to>');
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
});

console.log('Copying %s => %s', f, t);

var from = new api[path.extname(f)](f, function() {});
var to = new api[path.extname(t)](t, function() {});
var carmen = new Carmen({ from: from, to: to });

carmen._open(function(err) {
    if (err) throw err;
    to.startWriting(function(err) {
        if (err) throw err;
        var q = queue(100);
        var shardlevel = from._geocoder.shardlevel;
        var types = ['degen','term','freq','phrase','grid','feature'];
        for (var j = 0; j < types.length; j++) {
            var type = types[j];
            var limit = type === 'feature' ?
                Math.pow(16,shardlevel+1) :
                Math.pow(16,shardlevel);
            for (var i = 0; i < limit; i++) {
                q.defer(function(type, shard, callback) {
                    from.getGeocoderData(type, shard, function(err, buffer) {
                        if (err) return callback(err);
                        if (!buffer) return callback();
                        to.putGeocoderData(type, shard, buffer, callback);
                    });
                }, type, i);
            }
        }
        q.awaitAll(function(err) {
            to.stopWriting(function(err) {
                if (err) throw err;
                console.log('Done.');
            });
        });
    });
});
