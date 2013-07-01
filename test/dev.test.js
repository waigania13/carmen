var _ = require('underscore');
var fs = require('fs');
var assert = require('assert');
var util = require('util');
var Carmen = require('..');
var S3 = Carmen.S3();
var MBTiles = Carmen.MBTiles();

// Use BACKEND=<backend> env var to specify the carmen backend to be tested.
var backend = (process.env.BACKEND||'mbtiles').toLowerCase();
if (backend !== 'mbtiles' && backend !== 's3') {
    console.warn('Backend %s unknown.', backend);
    process.exit(1);
} else {
    console.warn('Testing %s backend.', backend);
}

if (backend === 'mbtiles') var carmen = new Carmen({
    country: new MBTiles(__dirname + '/../tiles/ne-countries.mbtiles', function(){}),
    province: new MBTiles(__dirname + '/../tiles/ne-provinces.mbtiles', function(){}),
    place: new MBTiles(__dirname + '/../tiles/mb-places.mbtiles', function(){}),
    street: new MBTiles(__dirname + '/../tiles/osm-streets-dc.mbtiles', function(){}),
});

function okay(type, a, b, margin) {
    var margin = margin || 0.01;
    var typecheck = type === 'place'
        ? a.type === b.type
        : a.type === type;
    return typecheck &&
        a.name === b.name &&
        (a.lon >= b.lon - margin) &&
        (a.lon <= b.lon + margin) &&
        (a.lat >= b.lat - margin) &&
        (a.lat <= b.lat + margin);
};

var summary = function(label, stats, verbose) {
    console.warn('');
    console.warn('  %s %s% (%s/%s) at %sms/query', label, (stats.okay/stats.total*100).toFixed(1), stats.okay, stats.total, (((+new Date) - stats.start)/stats.total).toFixed(1));

    if (!verbose) return;
    _(stats.failed).each(function(group, type) {
        console.warn('');
        console.warn('  ' + type);
        console.warn('  ' + new Array(type.length + 1).join('-'));
        _(group).each(function(results, name) {
            var results = results.join(', ');
            if (results.length > 60) results = results.substr(0,60) + '...';
            console.warn('  %s => %s', name, results);
        });
    });
}

function loadContext(path) {
    return _(fs.readFileSync(path, 'utf8').split('\n')).chain()
        .compact()
        .map(function(line) {
            var p = line.split('|');
            return { query: p[0], result: p.slice(1) };
        })
        .compact()
        .value();
};

var tests = {
    'kalorama dc': /Kalorama Road Northwest, Washington/,
    'florida dc': /Florida Street, Chevy Chase/,
    'florida ave dc': /Florida Avenue Northwest, Washington/,
    'ohio dr dc': /Ohio Drive Southwest, Washington/,
    'seattle wa': /Seattle, Washington/,
    'massachusetts ave': /Massachusetts Ave/,
    'new york ny': /New York, United/ // @TODO can we get this to work again...
};

describe('dev', function() {
    var stats = {
        start: + new Date,
        total: 0,
        okay: 0,
        failed: {}
    };
    _(tests).each(function(expected, query) {
        it(query, function(done) {
            carmen.geocode(query, function(err, res) {
                assert.ifError(err);
                stats.total++;
                var names = _(res.results[0]).chain()
                    .pluck('name')
                    .value();
                var inResults = expected.test(names.join(', '));
                if (inResults) {
                    stats.okay++;
                } else {
                    stats.failed.context = stats.failed.context || {};
                    stats.failed.context[query] = names;
                }
                done();
            });
        });
    });
    after(function() {
        summary('context', stats, true);
    });
});

