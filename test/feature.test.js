var tape = require('tape');
var feature = require('../lib/util/feature.js');

tape('seek', function(assert) {
    var shardString = JSON.stringify({
        1: JSON.stringify({ id: 1 }),
        2: JSON.stringify({ id: 2 }),
    });
    var shardBuffer = new Buffer(shardString);
    assert.deepEqual(feature.seek(shardString, 3), false);
    assert.deepEqual(feature.seek(shardString, 2), { id: 2 });
    assert.deepEqual(feature.seek(shardBuffer, 3), false);
    assert.deepEqual(feature.seek(shardBuffer, 2), { id: 2 });
    assert.end();
});

