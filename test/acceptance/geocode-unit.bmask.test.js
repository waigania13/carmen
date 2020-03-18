'use strict';
// Tests bounds mask generation.

const tape = require('tape');
const Carmen = require('../..');
const mem = require('../../lib/sources/api-mem');

tape('boundsmask', (t) => {
    const conf = {
        small: new mem({ maxzoom:6, geocoder_stack: ['west', 'east'] }, () => {}),
        west: new mem({ maxzoom:6, geocoder_stack: ['west'] }, () => {}),
        east: new mem({ maxzoom:6, geocoder_stack: ['east'] }, () => {})
    };
    const c = new Carmen(conf);
    t.deepEqual(conf.small.non_overlapping_indexes, [], 'small overlaps with all');
    t.deepEqual(conf.west.non_overlapping_indexes, [2], 'west overlaps with small');
    t.deepEqual(conf.east.non_overlapping_indexes, [1], 'east overlaps with small');
    t.ok(c);
    t.end();
});

