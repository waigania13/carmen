var queue = require('queue-async');

module.exports = loadall;

function loadall(source, concurrency, callback) {
    var s = source;
    var q = queue(concurrency || 10);
    var shardlevel = s._geocoder.shardlevel;
    var types = ['degen','term','phrase','grid'];

    types.forEach(function(type) {
        for (var i = 0; i < Math.pow(16, shardlevel); i++) q.defer(function(type, shard, callback) {
            source.getGeocoderData(type, shard, function(err, buffer) {
                if (err) return callback(err);
                if (!buffer) return callback();
                source._geocoder.loadSync(buffer, type, shard);
                callback();
            });
        }, type, i);
    });

    q.awaitAll(callback);
}