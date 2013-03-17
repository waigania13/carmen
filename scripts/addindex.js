#!/usr/bin/env node

var fs = require('fs');
var argv = process.argv;
var mbtiles = argv[2];
var MBTiles = require('../mbtiles');

if (!mbtiles) {
    console.warn('Usage: addindex.sh MBTILES');
    process.exit(1);
}
if (!fs.existsSync(mbtiles)) {
    console.warn('File %s does not exist.', mbtiles);
    process.exit(1);
}

new MBTiles(mbtiles, function(err, source) {
    if (err) throw err;
    source.indexable(function(err, docs) {
        if (err) throw err;
        source.startWriting(function(err) {
            var write = function() {
                if (!docs.length) return source.stopWriting(function(err) {
                    if (err) throw err;
                    console.log('Done.');
                });
                var doc = docs.shift();
                source.index(doc.id, doc.text, doc.doc, doc.zxy, function(err) {
                    if (err) throw err;
                    write();
                });
            };
            write();
        });
    });
});

