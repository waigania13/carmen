#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var argv = process.argv;
var Carmen = require('../index.js');
var termops = require('../lib/util/termops.js');
var Queue = require('../queue');
var f = argv[2];

if (!f) {
    console.warn('Usage: carmen-analyze.js <file>');
    process.exit(1);
}
if (!fs.existsSync(f)) {
    console.warn('File %s does not exist.', f);
    process.exit(1);
}

console.log('Analyzing %s ...', f);

var s = Carmen.auto(f);
var carmen = new Carmen({ s: s });

carmen.analyze(s, function(err, stats) {
    if (err) throw err;
    console.log('term <=> phrase index');
    console.log('---------------------');
    for (var key in stats.term) {
        var val = stats.term[key];
        if (key === 'maxes') {
            console.log('- %s:', key);
            val.forEach(function(entry, i) {
                console.log('  %s. %s (%s) %s', i+1, entry[0], entry[1], entry[2]);
            });
        } else {
            console.log('- %s: %s', key, val);
        }
    }

    console.log('');

    console.log('phrase <=> grid index');
    console.log('--------------------');
    for (var key in stats.grid) {
        var val = stats.grid[key];
        if (key === 'maxes') {
            console.log('- %s:', key);
            val.forEach(function(entry, i) {
                console.log('  %s. %s (%s) %s', i+1, entry[0], entry[1], entry[2]);
            });
        } else {
            console.log('- %s: %s', key, val);
        }
    }
});

