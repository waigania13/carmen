var queue = require('queue-async');

module.exports = {};
module.exports.loadall = loadall;
module.exports.unloadall = unloadall;

function loadall(source, concurrency, callback) {
    var s = source;
    var q = queue(Math.max(1, concurrency || 10));
    var shardlevel = s._geocoder.shardlevel;

    for (var i = 0; i < Math.pow(16, shardlevel); i++) q.defer(function(shard, callback) {
        source.getGeocoderData('grid', shard, function(err, buffer) {
            if (err) return callback(err);
            if (!buffer) return callback();
            setTimeout(function() {
                source._geocoder.loadSync(buffer, 'grid', shard);
                callback();
            }, Math.ceil(1/concurrency));
        });
    }, i);

    q.awaitAll(callback);
}

function unloadall(source, callback) {
    source._geocoder.unloadall('grid');
    callback();
}

