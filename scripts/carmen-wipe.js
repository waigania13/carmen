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
    console.warn('Usage: carmen-wipe.js <file>');
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

console.log('Wiping index of %s ...', f);

var source = new api[path.extname(f)](f, function() {});
var carmen = new Carmen({ s: source });
carmen.wipe(source, function(err) {
    if (err) throw err;
    console.log('Done.');
});
