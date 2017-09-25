const tape = require('tape');
const zlib = require('zlib');
const DawgCache = require('../lib/util/dawg');

tape('simulate 10m records', (t) => {
    const dict = new DawgCache();
    for (let i = 0; i < 10e6; i++) {
        let streetName = (Math.random()).toString(36).substr(-12);
        // - Assume an average of 4 housenum ranges
        // - Assume each streetName has one variation
        for (let a = 0; a < 4; a++) {
            let text = `${a+1}## ${streetName} st`;
            let variant = `${a+1}## ${streetName} street`;
            dict.setText(text, true);
            dict.setNormalization(text, variant);
        }
        if (i % 10e3 === 0) {
            console.warn(i);
        }
    }

    zlib.gzip(dict.dump(), (err, zdata) => {
        t.ifError(err);
        t.ok(zdata.length < 200e3, 'gzipped dictcache < 200k');
        zlib.gunzip(zdata, (err, data) => {
            t.ifError(err);
            let loaded = new DawgCache(data);
            for (let i = 1; i <= 4; i++) {
                t.equal(loaded.hasPhrase("a" + i, false), true, 'has a' + i);
            }
            t.equal(loaded.hasPhrase("a5", false), false, 'not a5');

            t.equal(loaded.hasPhrase("a", false), false, 'not a');
            t.equal(loaded.hasPhrase("a", true), true, 'has a as degen');

            t.end();
        });
    });
});

