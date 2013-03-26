#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var argv = process.argv;
var api = {
    '.s3': require('../api-s3'),
    '.mbtiles': require('../api-mbtiles')
};
var f = argv[2];

if (!f) {
    console.warn('Usage: carmen-index.js <file>');
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

console.log('Indexing %s ...', f);
new api[path.extname(f)](f, function(err, from) {
    if (err) throw err;
    from.startWriting(function(err) {
        if (err) throw err;
        var index = function(pointer) {
            from.indexable(pointer, function(err, docs, pointer) {
                if (!docs.length) return from.stopWriting(function(err) {
                    if (err) throw err;
                    console.log('Done.');
                });
                var write = function() {
                    if (!docs.length) return index(pointer);
                    var doc = docs.shift();
                    from.index(doc.id, doc.text, doc.doc, doc.zxy, function(err) {
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

