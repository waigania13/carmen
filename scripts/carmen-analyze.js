#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const argv = process.argv;
const Carmen = require('../index.js');
const termops = require('../lib/util/termops.js');
const f = argv[2];

if (!f) {
    console.warn('Usage: carmen-analyze.js <file>');
    process.exit(1);
}

if (!fs.existsSync(f)) {
    console.warn('File %s does not exist.', f);
    process.exit(1);
}

console.log('Analyzing %s ...', f);

const s = Carmen.auto(f);
const carmen = new Carmen({ s: s });

carmen.analyze(s, (err, stats) => {
    if (err) throw err;
    console.log(stats);
});

