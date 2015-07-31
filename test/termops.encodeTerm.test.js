var termops = require('../lib/util/termops');
var token = require('../lib/util/token');
var test = require('tape');

test('termops.encodeTerm', function(assert) {
    assert.deepEqual(termops.encodeTerm('main'), 3935363592, 'encodes term');
    assert.deepEqual(termops.encodeTerm('1234'), 4257489661, 'encodes numeric term');
    assert.deepEqual(termops.encodeTerm('2345b'), 1541883461, 'encodes seminumeric term');
    assert.deepEqual(termops.encodeTerm('2345'), 784195493, 'encodes seminumeric differently from numeric term');
    assert.deepEqual(termops.encodeTerm('LS24'), 651597038, 'encodes non-address numeric term with fnv1a');
    assert.end();
});

test('termops.encodeTerm collisions', function(assert) {
    var texts = 0;
    var sample = 1e6;
    var ids = {};
    var collisions = [];
    while (texts < sample) {
        var text = Math.random().toString(36);
        var id = termops.encodeTerm(text);
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

