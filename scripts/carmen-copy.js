#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const argv = process.argv;
const Carmen = require('../index.js');
const f = argv[2];
const t = argv[3];

if (!f || !t) {
    console.log('Usage: carmen-copy.js <from> <to>');
    process.exit(1);
}

const conf = {};

try {
    conf.from = Carmen.auto(f);
} catch(err) {
    console.warn('Error: Could not load index %s', f);
    process.exit(1);
}
try {
    conf.to = Carmen.auto(t);
} catch(err) {
    console.warn('Error: Could not load index %s', t);
    process.exit(1);
}

console.log('Copying %s => %s', f, t);

const carmen = new Carmen(conf);
carmen.copy(conf.from, conf.to, err => {
    if (err) throw err;
    conf.to.stopWriting(err => {
        if (err) throw err;
        console.log('Done.');
        process.exit(0);
    });
});

