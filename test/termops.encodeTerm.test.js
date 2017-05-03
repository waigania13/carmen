var termops = require('../lib/util/termops');
var test = require('tape');

test('termops.encodeTerm', function(t) {
    t.deepEqual(termops.encodeTerm('main'), 'main', 'encodes term');
    t.deepEqual(termops.encodeTerm('1234'), '1234', 'encodes numeric term');
    t.deepEqual(termops.encodeTerm('2345b'), '2345b', 'encodes seminumeric term');
    t.deepEqual(termops.encodeTerm('2345'), '2345', 'encodes seminumeric differently from numeric term');
    t.deepEqual(termops.encodeTerm('LS24'), 'LS24', 'encodes non-address numeric term with fnv1a');
    t.end();
});

test('termops.encodeTerm collisions', function(t) {
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
    var thresh = 1/1e6;
    t.equal(rate < thresh, true, 'Collision rate ' + (rate*100).toFixed(4) + '% < ' + (thresh*100).toFixed(4) + '%');
    t.end();
});

