'use strict';
const termops = require('../../../lib/text-processing/termops');
const test = require('tape');

test('numTokenize', (t) => {
    t.deepEqual(termops.numTokenize('foo-bar'), [], 'no numbers');
    t.deepEqual(termops.numTokenize('69-150'), [['#####']], 'only numbers');
    t.deepEqual(termops.numTokenize('500 main street 20009'), [
        ['###', 'main', 'street', '20009'],
        ['500', 'main', 'street', '#####'],
    ], 'two numbers');

    t.deepEqual(termops.numTokenize('foo-bar',3), [], 'no numbers');
    t.deepEqual(termops.numTokenize('69-150',3), [['69###']], 'only numbers');
    t.deepEqual(termops.numTokenize('500 main street 20009',3), [
        ['5##', 'main', 'street', '20009'],
        ['500', 'main', 'street', '20###'],
    ], 'two numbers');
    // intersection
    t.deepEqual(termops.numTokenize('9th street northwest and f street northwest'), [
        [ '+++', 'f', 'street', 'northwest', '9th', 'street', 'northwest' ],
    ], 'does this get tokenized');
    t.end();
});
