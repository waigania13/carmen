var _ = require('underscore');
var queue = require('queue-async');

module.exports = wipe;

function wipe(source, callback) {
    var s = source;
    var q = queue(100);
    var shardlevel = s._geocoder.shardlevel;
    var types = ['degen','term','freq','phrase','grid','feature'];

    s.startWriting(function(err) {
        if (err) return callback(err);
        for (var j = 0; j < types.length; j++) {
            var type = types[j];
            for (var i = 0; i < Math.pow(16,shardlevel); i++) {
                q.defer(transferGeocoderData, type, i);
            }
        }
        function transferGeocoderData(type, shard, callback) {
            s.getGeocoderData(type, shard, function(err, buffer) {
                if (err) return callback(err);
                if (!buffer) return callback();
                s.putGeocoderData(type, shard, new Buffer(0), callback);
            });
        }
        q.awaitAll(function(err) {
            if (err) return callback(err);
            s.stopWriting(callback);
        });
    });
}
