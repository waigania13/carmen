#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var argv = process.argv;
var Carmen = require('../index.js');
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
});

console.log('Copying %s => %s', f, t);

var from = Carmen.auto(f);
var to = Carmen.auto(t);
var carmen = new Carmen({ from: from, to: to });
carmen.copy(from, to, function(err) {
    if (err) throw err;
    to.stopWriting(function(err) {
        if (err) throw err;
        console.log('Done.');
        process.exit(0);
    });
});

