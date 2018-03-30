'use strict';

const fs = require('fs');
const argv = process.argv;
const Carmen = require('../..');
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

