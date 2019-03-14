'use strict';
const termops = require('../../../lib/text-processing/termops');
const test = require('tape');
const clone = (d) => { return JSON.parse(JSON.stringify(d)); };
const withAddress = (array, address) => {
    array.address = address;
    return array;
};

test('termops.permutations', (t) => {
    t.deepEqual(clone(termops.permutations(['a', 'b', 'c', 'd'])), [
        ['a','b','c','d'],
        ['a','b','c'],
        ['b','c','d'],
        ['a','b'],
        ['b','c'],
        ['c','d'],
        ['a'],
        ['b'],
        ['c'],
        ['d'],
    ]);
    t.deepEqual(clone(termops.permutations(['a', 'b', 'c'])), [
        ['a','b','c'],
        ['a','b'],
        ['b','c'],
        ['a'],
        ['b'],
        ['c'],
    ]);
    t.deepEqual(clone(termops.permutations(['a', 'b'])), [
        ['a','b'],
        ['a'],
        ['b'],
    ]);
    t.deepEqual(clone(termops.permutations(['a'])), [
        ['a'],
    ]);
    t.deepEqual(clone(termops.permutations(withAddress(['2##', 'b', 'c'], { number: 200, position: 0 }))), [
        ['2##','b','c'],
        ['2##','b'],
        ['b','c'],
        ['2##'],
        ['b'],
        ['c'],
    ]);
    t.deepEqual(clone(termops.permutations(withAddress(['a', 'b', '2##'], { number: 200, position: 2 }))), [
        ['2##','a','b'],
        ['a','b'],
        ['2##','b'],
        ['a'],
        ['b'],
        ['2##'],
    ]);
    t.deepEqual(clone(termops.permutations(withAddress(['a','2##','c'], { number: 200, position: 1 }))), [
        ['a','2##','c'],
        ['2##','a'],
        ['2##','c'],
        ['a'],
        ['2##'],
        ['c'],
    ]);
    t.end();
});

test('termops.permutations (props)', (t) => {
    const permutations = termops.permutations(['a', 'b', 'c', 'd'], [0.1, 0.1, 0.2, 0.6]);
    permutations.length = 10;

    t.deepEqual(permutations[0].join(','), ['a','b','c','d'].join(','));
    t.deepEqual(permutations[0].ender, true);
    t.deepEqual(permutations[0].relev, 1);
    t.deepEqual(permutations[0].mask.toString(2), '1111');

    t.deepEqual(permutations[1].join(','), ['a','b','c'].join(','));
    t.deepEqual(permutations[1].ender, false);
    t.deepEqual(permutations[1].relev, 0.4);
    t.deepEqual(permutations[1].mask.toString(2), '111');

    t.deepEqual(permutations[2].join(','), ['b','c','d'].join(','));
    t.deepEqual(permutations[2].ender, true);
    t.deepEqual(permutations[2].relev, 1.0);
    t.deepEqual(permutations[2].mask.toString(2), '1110');

    t.deepEqual(permutations[3].join(','), ['a','b'].join(','));
    t.deepEqual(permutations[3].ender, false);
    t.deepEqual(permutations[3].relev, 0.2);
    t.deepEqual(permutations[3].mask.toString(2), '11');

    t.deepEqual(permutations[4].join(','), ['b','c'].join(','));
    t.deepEqual(permutations[4].ender, false);
    t.deepEqual(permutations[4].relev, 0.4);
    t.deepEqual(permutations[4].mask.toString(2), '110');

    t.deepEqual(permutations[5].join(','), ['c','d'].join(','));
    t.deepEqual(permutations[5].ender, true);
    t.deepEqual(permutations[5].relev, 0.8);
    t.deepEqual(permutations[5].mask.toString(2), '1100');

    t.end();
});

test('termops.permutations (props: address)', (t) => {
    const permutations = termops.permutations(withAddress(['a','2##','c'], { number: 200, position: 1 }));

    t.equal(permutations[0].join(','), 'a,2##,c');
    t.deepEqual(permutations[0].address, { 'position': 1, 'number': 200, 'numberOrder': 'first' });

    t.equal(permutations[1].join(','), '2##,a');
    t.deepEqual(permutations[1].address, { 'position': 1, 'number': 200, 'numberOrder': 'last' });

    t.equal(permutations[2].join(','), '2##,c');
    t.deepEqual(permutations[2].address, { 'position': 1, 'number': 200, 'numberOrder': 'first' });

    t.equal(permutations[3].join(','), 'a');
    t.equal(typeof permutations[3].address, 'undefined');

    t.equal(permutations[4].join(','), '2##');
    t.deepEqual(permutations[4].address, { 'position': 1, 'number': 200, 'numberOrder': null });

    t.equal(permutations[5].join(','), 'c');
    t.equal(typeof permutations[5].address, 'undefined');

    t.end();
});

test('termops.permutations (props)', (t) => {
    const permutations = termops.permutations(['a', 'b', 'c'], [0.2, 0.2, 0.6]);
    t.deepEqual(permutations.length, 6);

    t.deepEqual(permutations[0].join(','), ['a','b','c'].join(','));
    t.deepEqual(permutations[0].ender, true);
    t.deepEqual(permutations[0].relev, 1);
    t.deepEqual(permutations[0].mask.toString(2), '111');

    t.deepEqual(permutations[1].join(','), ['a','b'].join(','));
    t.deepEqual(permutations[1].ender, false);
    t.deepEqual(permutations[1].relev, 0.4);
    t.deepEqual(permutations[1].mask.toString(2), '11');

    t.deepEqual(permutations[2].join(','), ['b','c'].join(','));
    t.deepEqual(permutations[2].ender, true);
    t.deepEqual(permutations[2].relev, 0.8);
    t.deepEqual(permutations[2].mask.toString(2), '110');

    t.end();
});

test('termops.permutations (props + all)', (t) => {
    const permutations = termops.permutations(['a', 'b', 'c'], [0.2, 0.2, 0.6], true);
    t.deepEqual(permutations.length, 7);

    t.deepEqual(permutations[0].join(','), ['a','b','c'].join(','));
    t.deepEqual(permutations[0].ender, true);
    t.deepEqual(permutations[0].relev, 1);
    t.deepEqual(permutations[0].mask.toString(2), '111');

    t.deepEqual(permutations[1].join(','), ['a','b'].join(','));
    t.deepEqual(permutations[1].ender, false);
    t.deepEqual(permutations[1].relev, 0.4);
    t.deepEqual(permutations[1].mask.toString(2), '11');

    t.deepEqual(permutations[2].join(','), ['a','c'].join(','));
    t.deepEqual(permutations[2].ender, true);
    t.deepEqual(permutations[2].relev, 0.8);
    t.deepEqual(permutations[2].mask.toString(2), '101');

    t.deepEqual(permutations[3].join(','), ['b','c'].join(','));
    t.deepEqual(permutations[3].ender, true);
    t.deepEqual(permutations[3].relev, 0.8);
    t.deepEqual(permutations[3].mask.toString(2), '110');

    t.end();
});

