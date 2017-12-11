const tape = require('tape');
const zlib = require('zlib');
const DawgCache = require('../lib/util/dawg');

tape('simulate 10m records', (assert) => {
    const dict = new DawgCache();
    for (let i = 0; i < 10e6; i++) {
        // - Generate a random street name
        // - Assume an average of 4 housenum ranges
        // - Assume each streetName has one variation
        let streetName = (Math.random()).toString(36).substr(-12);
        for (let a = 0; a < 4; a++) {
            let text = `${a+1}## ${streetName} st`;
            let variant = `${a+1}## ${streetName} street`;
            dict.setText(text, true);
            dict.setNormalization(text, variant);
        }
        if (i && i % 10e4 === 0) assert.comment(`${i} records simulated`);
    }

    zlib.gzip(dict.dump(), (err, zdata) => {
        assert.ifError(err);
        assert.ok(zdata.length < 200e3, 'gzipped dictcache < 200k');
        zlib.gunzip(zdata, (err, data) => {
            assert.ifError(err);
            assert.end();
        });
    });
});

