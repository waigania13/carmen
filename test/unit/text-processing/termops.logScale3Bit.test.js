'use strict';
const test = require('tape');
const termops = require('../../../lib/text-processing/termops');

test('encode', (t) => {
    let term = 0;
    term = termops.encode3BitLogScale(3566,180000);
    t.equal(term, 5);

    t.equal(termops.encode3BitLogScale(-1,10), 0);
    t.equal(termops.encode3BitLogScale(0,10), 0);
    t.equal(termops.encode3BitLogScale(1,10), 1);
    t.equal(termops.encode3BitLogScale(2,10), 3);
    t.equal(termops.encode3BitLogScale(3,10), 4);
    t.equal(termops.encode3BitLogScale(4,10), 5);
    t.equal(termops.encode3BitLogScale(5,10), 5);
    t.equal(termops.encode3BitLogScale(6,10), 6);
    t.equal(termops.encode3BitLogScale(7,10), 6);
    t.equal(termops.encode3BitLogScale(8,10), 7);
    t.equal(termops.encode3BitLogScale(9,10), 7);
    t.equal(termops.encode3BitLogScale(10,10), 7);

    t.end();
});

test('decode', (t) => {
    let term = 0;
    term = termops.decode3BitLogScale(5,180000, true);
    t.equal(term, 5672);

    t.equal(termops.decode3BitLogScale(0,10, true), 0);
    t.equal(termops.decode3BitLogScale(1,10, true), 1);
    t.equal(termops.decode3BitLogScale(2,10, true), 2);
    t.equal(termops.decode3BitLogScale(3,10, true), 3);
    t.equal(termops.decode3BitLogScale(4,10, true), 4);
    t.equal(termops.decode3BitLogScale(5,10, true), 5);
    t.equal(termops.decode3BitLogScale(6,10, true), 7);
    t.equal(termops.decode3BitLogScale(7,10, true), 10);
    t.equal(termops.decode3BitLogScale(6.5, 1.01), 1.0092824097422461);

    t.end();
});

