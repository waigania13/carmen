var tape = require('tape');
var feature = require('../lib/util/feature.js');

tape('shard', function(assert) {
    for (var level = 0; level < 7; level++) {
        var shards = {};
        for (var i = 0; i < Math.pow(2,20); i++) {
            var shard = feature.shard(level, i);
            shards[shard] = shards[shard] || 0;
            shards[shard]++;
        }
        var expected = Math.min(Math.pow(2,20), Math.pow(16, level + 1));
        assert.equal(Object.keys(shards).length, expected, 'shardlevel=' + level + ', shards=' + expected);
    }
    assert.end();
});

