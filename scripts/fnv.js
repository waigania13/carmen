#!/usr/bin/env node

// Apply a termops action on stdin stream and print to stdout.

var fs = require('fs');
var split = require('split');
var termops = require('../lib/util/termops.js');
var fnv = require('../lib/util/termops.js').fnv1a;
var type = process.argv[2];
var phrasematch = require('../lib/phrasematch.js');

if (type !== 'phrase' && type !== 'term') {
    console.log('Usage: fnv.js <phrase|term>');
    process.exit(1);
}

process.stdin.pipe(split()).on('data', function(line) {
    if (type == "phrase") {
        console.log('[PHRASE]:',fnv(termops.tokenize(line).join(' ')));
    } else if (type == "term") {
        termops.tokenize(line).forEach(function (l) {
            var hash = [];
            hash.push(parseInt(String(fnv(l, 28)).substring(0, String(fnv(l, 28)).length -2) + "00"))
            console.log('[TERM]:', JSON.stringify(hash));
        });
    }
});
