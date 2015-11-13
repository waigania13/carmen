#!/usr/bin/env node

var fs = require('fs');
var split = require('split');
var termops = require('../lib/util/termops.js');

process.stdin
    .pipe(split())
    .on('data', function(line) {
        process.stdout.write(termops.getPhraseDegens(termops.tokenize(line)).join('\n'));
    });
