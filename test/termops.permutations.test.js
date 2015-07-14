var termops = require('../lib/util/termops');
var test = require('tape');
var clone = function(d) { return JSON.parse(JSON.stringify(d)); }

test('termops.permutations', function(assert) {
    assert.deepEqual(clone(termops.permutations(['a','b','c','d'])), [
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
    assert.deepEqual(clone(termops.permutations(['a','b','c'])), [
        ['a','b','c'],
        ['a','b'],
        ['b','c'],
        ['a'],
        ['b'],
        ['c'],
    ]);
    assert.deepEqual(clone(termops.permutations(['a','b'])), [
        ['a','b'],
        ['a'],
        ['b'],
    ]);
    assert.deepEqual(clone(termops.permutations(['a'])), [
        ['a'],
    ]);
    assert.end();
});

test('termops.permutations (props)', function(assert) {
    var permutations = termops.permutations(['a','b','c','d'], [0.1, 0.1, 0.2, 0.6]);
    permutations.length = 10;

    assert.deepEqual(permutations[0].join(','), ['a','b','c','d'].join(','));
    assert.deepEqual(permutations[0].ender, true);
    assert.deepEqual(permutations[0].relev, 1);
    assert.deepEqual(permutations[0].mask.toString(2), '1111');

    assert.deepEqual(permutations[1].join(','), ['a','b','c'].join(','));
    assert.deepEqual(permutations[1].ender, false);
    assert.deepEqual(permutations[1].relev, 0.4);
    assert.deepEqual(permutations[1].mask.toString(2), '111');

    assert.deepEqual(permutations[2].join(','), ['b','c','d'].join(','));
    assert.deepEqual(permutations[2].ender, true);
    assert.deepEqual(permutations[2].relev, 1.0);
    assert.deepEqual(permutations[2].mask.toString(2), '1110');

    assert.deepEqual(permutations[3].join(','), ['a','b'].join(','));
    assert.deepEqual(permutations[3].ender, false);
    assert.deepEqual(permutations[3].relev, 0.2);
    assert.deepEqual(permutations[3].mask.toString(2), '11');

    assert.deepEqual(permutations[4].join(','), ['b','c'].join(','));
    assert.deepEqual(permutations[4].ender, false);
    assert.deepEqual(permutations[4].relev, 0.4);
    assert.deepEqual(permutations[4].mask.toString(2), '110');

    assert.deepEqual(permutations[5].join(','), ['c','d'].join(','));
    assert.deepEqual(permutations[5].ender, true);
    assert.deepEqual(permutations[5].relev, 0.8);
    assert.deepEqual(permutations[5].mask.toString(2), '1100');

    assert.end();
});

