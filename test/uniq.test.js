var uniq = require('../lib/util/uniq');
var test = require('tape');

test('.uniq', function(assert) {
    assert.deepEqual([5,4,3,2,1], uniq([5,3,1,2,5,4,3,1,4,2]));
    assert.end();
});

