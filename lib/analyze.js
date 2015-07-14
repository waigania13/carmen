var uniq = require('./util/uniq');
var decode = require('./util/grid').decode;
var termops = require('./util/termops');

module.exports = function analyze(source, callback) {
    var s = source;
    var stats = {
        total: 0,
        degen: 0,
        ender: 0,
        byScore: {},
        byRelev: {}
    };
    for (var i = 0; i < 7; i++) stats.byScore[i] = 0;
    for (var i = 0.4; i <= 1; i = i + 0.2) stats.byRelev[i.toFixed(1)] = 0;

    getStats(Math.pow(16,4), callback);

    function getStats(i, callback) {
        if (i < 0) return callback(null, stats);
        s.getGeocoderData('grid', i, function(err, buffer) {
            if (err) return callback(err);

            // @TODO should getGeocoderData return a 0-length buffer in this case?
            s._geocoder.load(buffer || new Buffer(0), 'grid', i);
            var ids = s._geocoder.list('grid', i);
            ids.sort();
            while (ids.length) {
                var id = ids.shift();
                var grids = s._geocoder.get('grid', id);
                rels = grids.length;

                // Verify that relations are unique.
                if (rels !== uniq(grids).length) {
                    return callback(new Error('Duplicate grids found for phrase: ' + id));
                }

                var l = grids.length;
                while (l--) {
                    var grid = decode(grids[l]);
                    stats.total++;

                    // degen vs ender
                    if (id % 2 === 0) {
                        stats.ender++;
                    } else {
                        stats.degen++;
                    }

                    stats.byScore[grid.score]++;
                    stats.byRelev[grid.relev.toFixed(1)]++;
                }
            }

            setImmediate(function() {
                getStats(--i, callback);
            });
        });
    }
};

