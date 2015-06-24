var termops = require('../lib/util/termops');
var test = require('tape');

test('termops.getPhraseDegens', function(assert) {
    assert.deepEqual(termops.getPhraseDegens(['main']), [
        'm',
        'ma',
        'mai',
        'main',
    ], 'degens for main');

    assert.deepEqual(termops.getPhraseDegens(['main', 'st']), [
        'm',
        'ma',
        'mai',
        'main',
        'main s',
        'main st',
    ], 'degens for main st - skip "main "');

    assert.deepEqual(termops.getPhraseDegens(['20009']), [
        '2',
        '20',
        '200',
        '2000',
        '20009',
    ], 'degens for 20009');

    assert.end();
});

