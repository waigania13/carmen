var _ = require('underscore');
var fs = require('fs');
var assert = require('assert');
var util = require('util');
var Carmen = require('..');
var feature = require('../lib/util/feature');
var tokenize = require('../lib/util/termops').tokenize;
var MBTiles = require('mbtiles');

var carmen = new Carmen({
    country: new MBTiles(__dirname + '/../tiles/01-ne.country.mbtiles', function(){}),
    province: new MBTiles(__dirname + '/../tiles/02-ne.province.mbtiles', function(){}),
    zipcode: new MBTiles(__dirname + '/../tiles/03-tiger.zipcode.mbtiles', function(){}),
    place: new MBTiles(__dirname + '/../tiles/04-mb.place.mbtiles', function(){})
});

function okay(a, b, margin) {
    margin = margin || 0.01;
    var namecheck = a.name === b.name;
    return namecheck &&
        a.name === b.name &&
        (a.lon >= b.lon - margin) &&
        (a.lon <= b.lon + margin) &&
        (a.lat >= b.lat - margin) &&
        (a.lat <= b.lat + margin);
}

var summary = function(label, stats, verbose) {
    console.warn('');
    console.warn('  %s %s% (%s/%s) at %sms/query',
        label,
        (stats.okay/stats.total*100).toFixed(1),
        stats.okay,
        stats.total,
        (((+new Date()) - stats.start)/stats.total).toFixed(1));

    if (!verbose) return;
    _(stats.failed).each(function(group, type) {
        console.warn('');
        console.warn('  ' + type);
        console.warn('  ' + new Array(type.length + 1).join('-'));
        _(group).each(function(results, name) {
            if (results.length > 40) results = results.substr(0,40) + '...';
            console.warn('  %s => %s', name, results);
        });
    });
};

_(carmen.indexes).each(function(source, type) {
    describe('geocode ' + type, function(done) {
        var queues = {
            geocode: [],
            reverse: []
        };
        var stats = {
            start: + new Date(),
            total: 0,
            okay: 0,
            failed: {}
        };
        before(function(done) {
            carmen._open(function(err) {
                assert.ifError(err);
                done();
            });
        });
        before(function(done) {
            feature.getAllFeatures(source, function(err, rows) {
                assert.ifError(err);
                queues.geocode = queues.geocode.concat(rows);
                queues.reverse = queues.reverse.concat(rows);
                done();
            });
        });
        after(function(done) {
            summary('geocode ' + type, stats, true);
            done();
        });
        var runner = function(mode) { return function(done) {
            if (!queues[mode].length) return done();

            var doc = queues[mode].shift();
            var text = doc._text.split(',')[0];

            // If docs have no text -- skip these.
            if (!tokenize(text).length) return done();
            if (!doc._center) return done(new Error('Doc has no _center ' + doc));

            var query = mode === 'geocode' ? text : doc._center.join(',');

            carmen.geocode(query, {}, function(err, res) {
                assert.ifError(err);
                stats.total++;
                var exact = res.features.filter(function(feat) {
                    return feat.id === type + '.' + doc._id
                })[0];
                var loose = res.features.filter(function(feat) {
                    return (feat.text.indexOf(text) !== -1) &&
                        Math.abs(feat.center[0]-doc.lon) < 0.01 &&
                        Math.abs(feat.center[1]-doc.lat) < 0.01;
                })[0];
                if (exact || loose) {
                    stats.okay++;
                } else {
                    stats.failed[type] = stats.failed[type] || {};
                    stats.failed[type][text] = res.features.length ? res.features[0].place_name : 'No results';
                }
                done();
            });
        }};
        var testcount = {
            country: 400,
            province: 400,
            zipcode: 400,
            place: 400
        };
        for (var i = 0; i < testcount[type]; i++) {
            it(type + ' geocode ' + i, runner('geocode'));
            it(type + ' reverse ' + i, runner('reverse'));
        }
    });
});
