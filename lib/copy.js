var queue = require('queue-async');

module.exports = function index(from, to, callback) {
    to.startWriting(function(err) {
        if (err) return callback(err);
        var q = queue(100);
        var shardlevel = from._geocoder.shardlevel;
        var types = ['degen','term','freq','phrase','grid','feature'];
        for (var j = 0; j < types.length; j++) {
            var type = types[j];
            var limit = type === 'feature' ?
                Math.pow(16,shardlevel+1) :
                Math.pow(16,shardlevel);
            for (var i = 0; i < limit; i++) {
                q.defer(function(type, shard, callback) {
                    from.getGeocoderData(type, shard, function(err, buffer) {
                        if (err) return callback(err);
                        if (!buffer) return callback();
                        to.putGeocoderData(type, shard, buffer, callback);
                    });
                }, type, i);
            }
        }
        q.awaitAll(function(err) {
            if (err) return callback(err);
            to.stopWriting(function(err) {
                if (err) return callback(err);
                to._geocoder.unloadall('freq');
                to._geocoder.unloadall('term');
                to._geocoder.unloadall('phrase');
                to._geocoder.unloadall('grid');
                to._geocoder.unloadall('degen');
                callback();
            });
        });
    });
};