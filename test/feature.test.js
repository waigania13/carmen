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

tape('shard', function(assert) {
    for (var level = 0; level < 5; level++) {
        var shards = {};
        for (var i = 0; i < Math.pow(2,20); i++) {
            var shard = feature.shard(level, i);
            shards[shard] = shards[shard] || 0;
            shards[shard]++;
        }
        assert.equal(Object.keys(shards).length, Math.pow(16, level + 1), 'shardlevel=' + level + ', shards=' + Math.pow(16, level + 1));
    }
    assert.end();
});
