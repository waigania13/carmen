var termops = require('../lib/util/termops');
var token = require('../lib/util/token');
var test = require('tape');

test('termops.encodePhrase', function(assert) {
    var a;

    a = termops.encodePhrase('main');
    assert.deepEqual(a, 3935363593, 'main');
    assert.deepEqual(a % 2, 1, 'main = non-degen');
    assert.deepEqual(Math.floor((a%8)/2), 0, 'main = 1 term');

    a = termops.encodePhrase('main', true);
    assert.deepEqual(a, 3935363592, 'main (degen)');
    assert.deepEqual(a % 2, 0, 'main = degen');
    assert.deepEqual(Math.floor((a%8)/2), 0, 'main = 1 term');

    a = termops.encodePhrase('main st');
    assert.deepEqual(a, 2339755451, 'main st');
    assert.deepEqual(a % 2, 1, 'main st = non-degen');
    assert.deepEqual(Math.floor((a%8)/2), 1, 'main st = 2 terms');

    // prev as token array
    a = termops.encodePhrase(['main','st']);
    assert.deepEqual(a, 2339755451, 'main st');
    assert.deepEqual(a % 2, 1, 'main st = non-degen');
    assert.deepEqual(Math.floor((a%8)/2), 1, 'main st = 2 terms');

    a = termops.encodePhrase('lazy dog');
    assert.deepEqual(a, 1926855971, 'lazy dog')
    assert.deepEqual(a % 2, 1, 'lazy dog = non-degen');
    assert.deepEqual(Math.floor((a%8)/2), 1, 'lazy dog = 2 terms');

    a = termops.encodePhrase('lazy dog', 1);
    assert.deepEqual(a, 1926855970, 'lazy dog (degen)')
    assert.deepEqual(a % 2, 0, 'lazy dog = degen');
    assert.deepEqual(Math.floor((a%8)/2), 1, 'lazy dog = 2 terms');

    a = termops.encodePhrase('The quick brown fox jumps over the lazy dog');
    assert.deepEqual(a, 4016652279, 'long phrase');
    assert.deepEqual(a % 2, 1, 'long phrase = non-degen');
    assert.deepEqual(Math.floor((a%8)/2), 3, 'long phrase >= 4 terms');

    a = termops.encodePhrase('The quick brown fox jumps over the lazy dog', true);
    assert.deepEqual(a, 4016652278, 'long phrase (degen)');
    assert.deepEqual(a % 2, 0, 'long phrase = degen');
    assert.deepEqual(Math.floor((a%8)/2), 3, 'long phrase >= 4 terms');

    // unicode vs unidecoded
    a = termops.encodePhrase('京都市');
    assert.deepEqual(a, 3849941229, '京都市');
    assert.deepEqual(a % 2, 1, '京都市 = non-degen');
    assert.deepEqual(Math.floor((a%8)/2), 2, '京都市 = 3 terms');

    a = termops.encodePhrase('jing du shi');
    assert.deepEqual(a, 3849941229, 'jing du shi = 京都市');
    assert.deepEqual(a % 2, 1, 'jing du shi = non-degen');
    assert.deepEqual(Math.floor((a%8)/2), 2, 'jing du shi = 3 terms');

    // known examples of fnv1a phrase collisions
    // these will be datapoints for decolliding strategies elsewhere...
    assert.deepEqual(
        termops.encodePhrase('av francisco de aguirre # la serena'),
        termops.encodePhrase('# r ademar da silva neiva'),
        'known collisions: #1'
    );

    assert.end();
});

test('termops.encodePhrase collisions', function(assert) {
    var texts = 0;
    var sample = 1e6;
    var ids = {};
    var collisions = [];
    while (texts < sample) {
        var text = Math.random().toString(36);
        var id = termops.encodePhrase(text);
        if (ids[id] === text) {
            continue;
        } else if (ids[id]) {
            collisions.push([ids[id], text]);
        } else {
            ids[id] = text;
        }
        texts++;
    }
    var rate = (collisions.length/sample);
    assert.equal(rate < 0.001, true, 'Collision rate ' + (rate*100).toFixed(3) + '% < 0.1%');
    assert.end();
});

