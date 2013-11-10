var _ = require('underscore');
var queue = require('queue-async');

module.exports = function wipe(source, callback) {
    var s = source;
    var q = queue(100);
    var shardlevel = s._geocoder.shardlevel;
    var types = ['degen','term','freq','phrase','grid'];

    s.startWriting(function(err) {
        if (err) return callback(err);
        for (var j = 0; j < types.length; j++) {
            var type = types[j];
            for (var i = 0; i < Math.pow(16,shardlevel); i++) {
                q.defer(function(type, shard, callback) {
                    s.getCarmen(type, shard, function(err, buffer) {
                        if (err) return callback(err);
                        if (!buffer) return callback();
                        s.putCarmen(type, shard, new Buffer(0), callback);
                    });
                }, type, i);
            }
        }
        q.awaitAll(function(err) {
            if (err) return callback(err);
            s.stopWriting(callback);
        });
    });
}
