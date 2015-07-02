var queue = require('queue-async');

module.exports = wipe;

function wipe(source, callback) {
    var s = source;
    var q = queue(100);
    var shardlevel = s._geocoder.shardlevel;
    var types = ['freq','grid','feature'];

    s.startWriting(function(err) {
        if (err) return callback(err);
        for (var j = 0; j < types.length; j++) {
            var type = types[j];
            var limit = type === 'feature' ?
                Math.pow(16,shardlevel+1) :
                Math.pow(16,shardlevel);
            for (var i = 0; i < limit; i++) {
                q.defer(transferGeocoderData, type, i);
            }
        }
        function transferGeocoderData(type, shard, callback) {
            s.getGeocoderData(type, shard, function(err, buffer) {
                if (!buffer) return callback();
                s.putGeocoderData(type, shard, type === 'feature' ? '{}' : new Buffer(0), callback);
            });
        }
        q.awaitAll(function(err) {
            if (err) return callback(err);
            s.stopWriting(callback);
        });
    });
}
