var _ = require('underscore');
var termops = require('./util/termops');

module.exports = function analyze(source, callback) {
    var s = source;
    var shardlevel = s._geocoder.shardlevel;
    var stats = {};
    stats.shardlevel = shardlevel;
    stats.term = {
        min:Infinity,
        max:0,
        mean:0,
        count:0,
        maxes:[]
    };
    stats.grid = {
        min:Infinity,
        max:0,
        mean:0,
        count:0,
        maxes:[]
    };
    relstats('term', 0, function(err) {
        if (err) return callback(err);
        relstats('grid', 0, function(err) {
            if (err) return callback(err);
            return callback(null, stats);
        });
    });

    function relstats(type, i, callback) {
        i = i || 0;

        var rels;
        var uniq;
        var list;
        var stat = stats[type];

        // If complete or on a 100th run go through maxes.
        if (i >= Math.pow(16, shardlevel) || (i % 100) === 0) {
            stat.maxes.sort(function(a, b) {
                return a[1] > b[1] ? -1 : a[1] < b[1] ? 1 : 0;
            });
            stat.maxes = stat.maxes.slice(0,10);
        }

        // Done.
        if (i >= Math.pow(16, shardlevel)) {
            return type === 'term'
                ? termlookup(stat.maxes, 0, callback)
                : phraselookup(stat.maxes, 0, callback);
        }

        s.getGeocoderData(type, i, function(err, buffer) {
            if (err) return callback(err);
            // @TODO should getGeocoderData return a 0-length buffer in this case?
            s._geocoder.load(buffer || new Buffer(0), type, i);
            var ids = s._geocoder.list(type, i);
            while (ids.length) {
                var id = ids.shift();
                list = s._geocoder.get(type, id);
                rels = list.length;

                // Verify that relations are unique.
                list.sort();
                if (rels !== _(list).uniq(true).length) {
                    console.warn(type + '.' + id + ' has non-unique relations: ' + list);
                }

                stat.min = Math.min(stat.min, rels);
                stat.max = Math.max(stat.max, rels);
                stat.mean = ((stat.mean * stat.count) + rels) / (stat.count + 1);
                stat.count++;
                stat.maxes.push([id,rels,list[0]]);
            }
            relstats(type, ++i, callback);
        });
    };

    function termlookup(maxes, i, callback) {
        if (i >= maxes.length) return callback();
        var term = maxes[i][0];
        var grid = maxes[i][2];
        var ids = [grid];
        s._geocoder.getall(s.getGeocoderData.bind(s), 'grid', ids, function(err, result) {
            if (err) return callback(err);
            if (!result.length) return callback(new Error('Grid ' + grid + ' not found'));
            var id = result[0] % Math.pow(2,25);
            s._features.getone(s.getGeocoderData.bind(s), 'feature', id, function(err, features) {
                if (err) return callback(err);
                // @TODO assumes no collisions.
                var doc = features[Object.keys(features).shift()];
                var text = doc.search || doc.name || '';
                var query = termops.tokenize(text);
                var terms = termops.terms(query);
                var idx = terms.indexOf(+term);
                if (idx !== -1) {
                    maxes[i].unshift(query[idx]);
                } else {
                    maxes[i].unshift(text);
                }
                termlookup(maxes, ++i, callback);
            });
        });
    };

    function phraselookup(maxes, i, callback) {
        if (i >= maxes.length) return callback();
        var grid = maxes[i][0];
        var ids = [grid];
        s._geocoder.getall(s.getGeocoderData.bind(s), 'grid', ids, function(err, result) {
            if (!result.length) return callback(new Error('Grid ' + grid + ' not found'));
            var id = result[0] % Math.pow(2,25);
            s._features.getone(s.getGeocoderData.bind(s), 'feature', id, function(err, features) {
                if (err) return callback(err);
                // @TODO assumes no collisions.
                var doc = features[Object.keys(features).shift()];
                var text = doc.search || doc.name || '';
                _(text.split(',')).each(function(syn) {
                    var tokens = termops.tokenize(syn);
                    if (termops.phrase(tokens) === +grid) {
                        maxes[i].unshift(tokens.join(' '));
                    }
                });
                phraselookup(maxes, ++i, callback);
            });
        });
    };
}
