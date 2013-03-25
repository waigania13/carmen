#!/usr/bin/env node

var fs = require('fs');
var argv = process.argv;
var MBTiles = require('../mbtiles');
var mbtiles = argv[2];
var S3 = require('../s3');
var s3 = argv[3];

if (!mbtiles) {
    console.warn('Usage: tos3.js <from.mbtiles> <to.s3>');
    process.exit(1);
}
if (!fs.existsSync(mbtiles)) {
    console.warn('File %s does not exist.', mbtiles);
    process.exit(1);
}
if (!fs.existsSync(s3)) {
    console.warn('File %s does not exist.', s3);
    process.exit(1);
}

new MBTiles(mbtiles, function(err, from) {
    if (err) throw err;
    new S3(s3, function(err, s3) {
        if (err) throw err;
        s3.startWriting(function(err) {
            if (err) throw err;
            var index = function(pointer) {
                from.indexable(pointer, function(err, docs, pointer) {
                    if (err) throw err;
                    if (!docs.length) return s3.stopWriting(function(err) {
                        if (err) throw err;
                        console.log('Done.');
                    });
                    var write = function() {
                        if (!docs.length) return index(pointer);
                        var doc = docs.shift();
                        s3.index(doc.id, doc.text, doc.doc, doc.zxy, function(err) {
                            if (err) throw err;
                            write();
                        });
                    };
                    write();
                });
            };
            index();
        });
    });
});

