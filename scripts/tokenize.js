#!/usr/bin/env node

// Apply a termops action on stdin stream and print to stdout.

const readline = require('readline');
const termops = require('../lib/util/termops.js');
const type = process.argv[2];

console.error('Enter a token or phrase below to tokenize');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
}).on('line', line => {
    rl.output.write(JSON.stringify(termops.tokenize(line)) + '\n');
});
