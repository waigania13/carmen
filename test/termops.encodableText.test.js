var termops = require('../lib/util/termops');
var token = require('../lib/util/token');
var test = require('tape');

test('termops.encodableText', function(assert) {
    assert.deepEqual(termops.encodableText('New York'), 'xnew york', 'encodes latin range');
    assert.deepEqual(termops.encodableText('京都市'), 'zjing du shi', 'encodes CJK range');
    assert.deepEqual(termops.encodableText(decodeURIComponent('%E2%98%BA')) !== 'x', true, 'Does not encode an emoji to an empty string');
    assert.end();
});

