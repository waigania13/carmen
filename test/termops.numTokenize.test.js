const termops = require('../lib/util/termops');
const test = require('tape');

test('numTokenize', (t) => {
    t.deepEqual(termops.numTokenize('foo-bar'), [], 'no numbers');
    t.deepEqual(termops.numTokenize('69-150'), [['#####']], 'only numbers');
    t.deepEqual(termops.numTokenize('500 main street 20009'), [
        ['###', 'main', 'street', '20009'],
        ['500', 'main', 'street', '#####'],
    ], 'two numbers');

    t.deepEqual(termops.numTokenize('foo-bar',3), [], 'no numbers');
    t.deepEqual(termops.numTokenize('69-150',3), [['6####']], 'only numbers');
    t.deepEqual(termops.numTokenize('500 main street 20009',3), [
        ['5##', 'main', 'street', '20009'],
        ['500', 'main', 'street', '2####'],
    ], 'two numbers');
    t.end();
});

