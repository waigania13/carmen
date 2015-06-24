var termops = require('../lib/util/termops');
var test = require('tape');

test('termops.getWeights', function(assert) {
    var res;
    var tokens;
    var freq;

    tokens = ['a','b','c'];
    freq = {};
    freq[0] = [1002];
    freq[termops.encodeTerm(tokens[0])] = [1000];
    freq[termops.encodeTerm(tokens[1])] = [1];
    freq[termops.encodeTerm(tokens[2])] = [1];

    assert.deepEqual(termops.getWeights(tokens, freq), [
        0.047820577394264194,
        0.47608971130286787,
        0.47608971130286787
    ], 'weights terms');

    assert.end();
});

