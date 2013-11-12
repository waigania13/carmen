var _ = require('underscore');

module.exports = function verify(source, callback) {
    var s = source;
    var shardlevel = s._geocoder.shardlevel;

    function checkall(from, to, i, stats, callback) {
        stats = stats || [ 0, 0 ];

        if (i === Math.pow(16, shardlevel)) return callback(null, stats);

        s.getGeocoderData(from, i, function(err, buffer) {
            if (err) return callback(err);
            s._geocoder.load(buffer || new Buffer(0), from, i);
            var ids = s._geocoder.list(from, i);
            stats[0] += ids.length;
            (function check() {
                if (!ids.length) return checkall(from, to, ++i, stats, callback);
                var fromid = +ids.shift();
                var toids = s._geocoder._get(from, +i, fromid);
                if (from === 'degen') toids = toids.map(function(v) { return Math.floor(v/4); });
                stats[1] += toids.length;
                s._geocoder.getall(s.getGeocoderData.bind(s), to, toids, function(err, res) {
                    if (err) return callback(err);
                    if (!res.length) return callback(new Error('Broken reference: ' + [from,fromid,to,toids].join(',')));
                    process.nextTick(function() { check() });
                });
            })();
        });
    };

    var results = [];
    checkall('term', 'phrase', 0, null, function(err, stats) {
        if (err) return callback(err);
        results.push({ relation: ['term', 'phrase'], count: stats });
        checkall('term', 'grid', 0, null, function(err, stats) {
            if (err) return callback(err);
            results.push({ relation: ['term', 'grid'], count: stats });
            checkall('phrase', 'freq', 0, null, function(err, stats) {
                if (err) return callback(err);
                results.push({ relation: ['phrase', 'freq'], count: stats });
                return callback(null, results);
            });
        });
    });
}
