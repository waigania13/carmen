#!/usr/bin/env node

// Apply a termops action on stdin stream and print to stdout.

var fs = require('fs');
var split = require('split');
var termops = require('../lib/util/termops.js');
var fnv = require('../lib/util/fnv.js');
var type = process.argv[2];

if (type !== 'phrase' && type !== 'term') {
    console.log('Usage: fnv.js <phrase|term>');
    process.exit(1);
}

var separator = type === 'phrase' ? ' ' : '\n';

process.stdin
    .pipe(split())
    .on('data', function(line) {

	var hash = [];
	termops.tokenize(line).forEach(function (l) {
	    hash.push(fnv(l, null));
	});
	
        process.stdout.write(hash.join(separator) + '\n');

    });
