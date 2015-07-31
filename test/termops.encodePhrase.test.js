var termops = require('../lib/util/termops');
var token = require('../lib/util/token');
var test = require('tape');

test('termops.encodePhrase', function(assert) {
    var a;

    a = termops.encodePhrase('main');
    assert.deepEqual(a, 609659059851265, 'main');
    assert.deepEqual(a % 2, 1, 'main = non-degen');

    a = termops.encodePhrase('main', true);
    assert.deepEqual(a, 609659059851264, 'main (degen)');
    assert.deepEqual(a % 2, 0, 'main = degen');

    a = termops.encodePhrase('main st');
    assert.deepEqual(a, 2135214313017581, 'main st');
    assert.deepEqual(a % 2, 1, 'main st = non-degen');

    // prev as token array
    a = termops.encodePhrase(['main','st']);
    assert.deepEqual(a, 2135214313017581, 'main st');
    assert.deepEqual(a % 2, 1, 'main st = non-degen');

    a = termops.encodePhrase('lazy dog');
    assert.deepEqual(a, 1523002542039449, 'lazy dog')
    assert.deepEqual(a % 2, 1, 'lazy dog = non-degen');

    a = termops.encodePhrase('lazy dog', 1);
    assert.deepEqual(a, 1523002542039448, 'lazy dog (degen)')
    assert.deepEqual(a % 2, 0, 'lazy dog = degen');

    a = termops.encodePhrase('The quick brown fox jumps over the lazy dog');
    assert.deepEqual(a, 2067419977200835, 'long phrase');
    assert.deepEqual(a % 2, 1, 'long phrase = non-degen');

    a = termops.encodePhrase('The quick brown fox jumps over the lazy dog', true);
    assert.deepEqual(a, 2067419977200834, 'long phrase (degen)');
    assert.deepEqual(a % 2, 0, 'long phrase = degen');

    // unicode vs unidecoded
    a = termops.encodePhrase('京都市');
    assert.deepEqual(a, 657403748910369, '京都市');
    assert.deepEqual(a % 2, 1, '京都市 = non-degen');

    a = termops.encodePhrase('jing du shi');
    assert.deepEqual(a, 657403748910369, 'jing du shi = 京都市');
    assert.deepEqual(a % 2, 1, 'jing du shi = non-degen');

    // known examples of fnv1a phrase collisions
    // these will be datapoints for decolliding strategies elsewhere...

    // no longer a collision in 52-bit fnv1a
    // assert.deepEqual(
    //     termops.encodePhrase('av francisco de aguirre # la serena'),
    //     termops.encodePhrase('# r ademar da silva neiva'),
    //     'known collisions: #1'
    // );

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
    var thresh = 1/1e6;
    assert.equal(rate < thresh, true, 'Collision rate ' + (rate*100).toFixed(4) + '% < ' + (thresh*100).toFixed(4) + '%');
    assert.end();
});

