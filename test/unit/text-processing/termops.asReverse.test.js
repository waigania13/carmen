'use strict';
const termops = require('../../../lib/text-processing/termops');
const test = require('tape');

test('Detects and parses lonlat', (t) => {
    t.deepEqual(termops.asReverse('40,0', true), [40,0]);
    t.deepEqual(termops.asReverse('40.00000,-40.31200'), [40,-40.312]);
    t.deepEqual(termops.asReverse('-120.9129102983109, 45.312312'), [-120.9129102983109,45.312312]);
    // Housenumber like pairs are left alone
    t.deepEqual(termops.asReverse('1400 15'), false);
    t.deepEqual(termops.asReverse('14th 15th'), false);

    // ParseFloat can think a string is a reverse query as `9 Street` is a valid Float - enforce numeric input
    t.deepEqual(termops.asReverse('9 rue Alphonse Penaud Paris, 75020 France'), false);
    t.deepEqual(termops.asReverse('9 a, 10 b'), false);
    t.deepEqual(termops.asReverse('9 a, 10'), false);
    t.deepEqual(termops.asReverse('9,10 b'), false);

    t.end();
});

test('edge cases', (t) => {
    t.deepEqual(termops.asReverse(''), false, 'empty string');
    t.deepEqual(termops.asReverse('0,0', true), [0,0], 'null island');
    t.deepEqual(termops.asReverse('010,020', true), [10,20], 'leading zeros are trimmed');
    t.deepEqual(termops.asReverse('1,2,3', true), false, 'extra number');
    t.end();
});
