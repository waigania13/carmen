var termops = require('../lib/util/termops');
var test = require('tape');

test('termops.decollide', function(assert) {
    assert.deepEqual(termops.decollide([
        ['##', 'main', 'street' ],
        ['main', 'street', '##' ],
        ['#', 'main', 'street' ],
        ['main', 'street', '#' ],
    ], '## ma'), true, 'decollides');

    assert.deepEqual(termops.decollide([
        ['京都市'],
    ], '京'), true, 'decollides - unicode');

    assert.deepEqual(termops.decollide([
        ['京都市'],
    ], 'jing'), true, 'decollides - unidecodes');

    assert.deepEqual(termops.decollide([
        ['##', 'main', 'street' ],
        ['main', 'street', '##' ],
        ['#', 'main', 'street' ],
        ['main', 'street', '#' ],
    ], 'market'), false, 'finds collision: letter "k"');

    assert.end();
});

