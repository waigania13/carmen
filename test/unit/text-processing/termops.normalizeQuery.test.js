'use strict';
const termops = require('../../../lib/text-processing/termops');
const test = require('tape');

test('termops.normalizeQuery', (t) => {
    let r;

    r = termops.normalizeQuery(termops.tokenize('New York'));
    t.deepEqual(r.tokens, ['new', 'york'], 'encodes latin range');

    r = termops.normalizeQuery(termops.tokenize('Ciudad Juárez'));
    t.deepEqual(r.tokens, ['ciudad', 'juarez'], 'encodes latin range w/ accents');

    r = termops.normalizeQuery(termops.tokenize('京都市'));
    t.deepEqual(r.tokens, ['京', '都', '市'], 'encodes CJK range');

    r = termops.normalizeQuery(termops.tokenize(decodeURIComponent('%E2%98%BA')));
    t.deepEqual(r.tokens, [], 'encodes an emoji to an actually empty string');

    r = termops.normalizeQuery(termops.tokenize('a' + decodeURIComponent('%E2%98%BA') + 'b'));
    t.deepEqual(r.tokens, ['ab'], 'removes an emoji in the middle of a string');

    r = termops.normalizeQuery(termops.tokenize('a ' + decodeURIComponent('%E2%98%BA') + ' b'));
    t.deepEqual(r.tokens, ['a', 'b'], 'removes an emoji w/o leaving a gap');

    r = termops.normalizeQuery(termops.tokenize(decodeURIComponent('%E2%98%BA %E2%98%BA')));
    t.deepEqual(r.tokens, [], 'encodes an emoji to an actually empty string');
    t.end();
});
