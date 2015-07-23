var termops = require('../lib/util/termops');
var test = require('tape');

test('numTokenize', function(assert) {
    assert.deepEqual(termops.numTokenize('foo-bar'), [], 'no numbers');
    assert.deepEqual(termops.numTokenize('69-150'), [['#####']], 'only numbers');
    assert.deepEqual(termops.numTokenize('500 main street 20009'), [
        ['###', 'main', 'street', '20009'],
        ['#####', '500', 'main', 'street'],
    ], 'two numbers');

    assert.deepEqual(termops.numTokenize('foo-bar',3), [], 'no numbers');
    assert.deepEqual(termops.numTokenize('69-150',3), [['69###']], 'only numbers');
    assert.deepEqual(termops.numTokenize('500 main street 20009',3), [
        ['5##', 'main', 'street', '20009'],
        ['20###', '500', 'main', 'street'],
    ], 'two numbers');
    assert.end();
});

