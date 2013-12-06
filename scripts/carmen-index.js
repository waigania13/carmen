#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var argv = process.argv;
var Carmen = require('../index.js');
var Queue = require('../queue');
var f = argv[2];
var t = argv[3];

if (!f) {
    console.warn('Usage: carmen-index.js <from> [to]');
    process.exit(1);
}

var nogrids = ('NOGRIDS' in process.env);
if (nogrids) console.log('Indexing without grids.');

console.log('Indexing %s ...', f);

var from = Carmen.auto(f);
var to = t ? Carmen.auto(t) : from;
var carmen = new Carmen({ from: from, to: to });
var last = +new Date;
var total = 0;

carmen.on('index', function(num) {
    console.log('Indexed %s docs @ %s/s', num, Math.floor(num * 1000 / (+new Date - last)));
    last = +new Date;
});
carmen.on('store', function(num) {
    last = +new Date;
});
carmen.index(from, to, {nogrids:nogrids}, function(err) {
    if (err) throw err;
    console.log('Stored in %ss', Math.floor((+new Date - last) * 0.001));
    console.log('Done.');
    process.exit(0);
});
