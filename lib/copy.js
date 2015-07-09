var queue = require('queue-async');

module.exports = function index(from, to, callback) {
    to.startWriting(function(err) {
        if (err) return callback(err);
        var q = queue(2);
        var shardlevel = from._geocoder.shardlevel;
        var types = ['freq','grid','look','feature'];
        for (var j = 0; j < types.length; j++) {
            var type = types[j];
            var limit = type === 'feature' ?
                Math.min(Math.pow(2,20), Math.pow(16,shardlevel+1)) :
                Math.pow(16,shardlevel);
            // Chunk shards ops in groups of 10000 to avoid
            // exceeding call stack with large shardlevels.
            for (var i = 0; i < limit; i = i + 10000) q.defer(function(type, i, callback) {
                var subq = queue(200);
                for (var k = 0; k < 10000; k++) subq.defer(function(type, shard, callback) {
                    from.getGeocoderData(type, shard, function(err, buffer) {
                        if (err) return callback(err);
                        if (!buffer) return callback();
                        to.putGeocoderData(type, shard, buffer, callback);
                    });
                }, type, i + k);
                subq.awaitAll(callback);
            }, type, i);
        }
        q.awaitAll(function(err) {
            if (err) return callback(err);
            to.stopWriting(function(err) {
                if (err) return callback(err);
                to._geocoder.unloadall('freq');
                to._geocoder.unloadall('grid');
                callback();
            });
        });
    });
};
