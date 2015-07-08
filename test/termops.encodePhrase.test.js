var termops = require('../lib/util/termops');
var token = require('../lib/util/token');
var test = require('tape');

test('termops.encodePhrase', function(assert) {
    var a;

    a = termops.encodePhrase('main');
    assert.deepEqual(a, 3935363593, 'main');
    assert.deepEqual(a % 2, 1, 'main = non-degen');

    a = termops.encodePhrase('main', true);
    assert.deepEqual(a, 3935363592, 'main (degen)');
    assert.deepEqual(a % 2, 0, 'main = degen');

    a = termops.encodePhrase('main st');
    assert.deepEqual(a, 2339755455, 'main st');
    assert.deepEqual(a % 2, 1, 'main st = non-degen');

    // prev as token array
    a = termops.encodePhrase(['main','st']);
    assert.deepEqual(a, 2339755455, 'main st');
    assert.deepEqual(a % 2, 1, 'main st = non-degen');

    a = termops.encodePhrase('lazy dog');
    assert.deepEqual(a, 1926855969, 'lazy dog')
    assert.deepEqual(a % 2, 1, 'lazy dog = non-degen');

    a = termops.encodePhrase('lazy dog', 1);
    assert.deepEqual(a, 1926855968, 'lazy dog (degen)')
    assert.deepEqual(a % 2, 0, 'lazy dog = degen');
    
    a = termops.encodePhrase('The quick brown fox jumps over the lazy dog');
    assert.deepEqual(a, 4016652273, 'long phrase');
    assert.deepEqual(a % 2, 1, 'long phrase = non-degen');

    a = termops.encodePhrase('The quick brown fox jumps over the lazy dog', true);
    assert.deepEqual(a, 4016652272, 'long phrase (degen)');
    assert.deepEqual(a % 2, 0, 'long phrase = degen');

    assert.end();
});

