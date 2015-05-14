var termops = require('../lib/util/termops');
var test = require('tape');

test('termops.parseSemiNumber', function(assert) {
    assert.equal(termops.parseSemiNumber('320'), 320);
    assert.equal(termops.parseSemiNumber('320th'), 320);
    assert.equal(termops.parseSemiNumber('LS24 8EG'), 248);
    assert.equal(termops.parseSemiNumber('Anything With 1 Number'), 1);
    assert.equal(termops.parseSemiNumber('no numbers'), null);
    assert.end();
});

