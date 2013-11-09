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

var source = new api[path.extname(f)](f, function() {});
var carmen = new Carmen({ s: source });
carmen.verify(source, function(err, stats) {
    if (err) throw err;
    stats.forEach(function(stat) {
        console.log('Verified relation %s x%s => %s x%s', stat.relation[0], stat.count[0], stat.relation[1], stat.count[1]);
    });
});
