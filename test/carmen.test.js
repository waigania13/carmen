var _ = require('underscore');
var fs = require('fs');
var assert = require('assert');
var util = require('util');
var carmen = new (require('..'))();

function okay(type, a, b) {
    var margin = 0.01;
    var typecheck = type === 'place'
        ? _(['city', 'town', 'village']).include(a.type)
        : a.type === type;
    return typecheck &&
        a.name === b.name &&
        (a.lon >= b.lon - margin) &&
        (a.lon <= b.lon + margin) &&
        (a.lat >= b.lat - margin) &&
        (a.lat <= b.lat + margin);
};

function loadFixture(path, sample) {
    var fixtures = _(fs.readFileSync(path, 'utf8').split('\n')).chain()
        .compact()
        .map(function(line) {
            var p = line.split(',');
            if (p[0]) return {
                name: p[0],
                lon: parseFloat(p[1]),
                lat: parseFloat(p[2])
            };
        })
        .compact()
        .value();
    if (sample) fixtures = _(_(fixtures).shuffle().slice(0, sample))
        .sortBy(function(r) { return r.name });
    return fixtures;
};

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

var fixtures = {};
fixtures.country = loadFixture(__dirname + '/../fixtures/test-countries.csv');
fixtures.province = loadFixture(__dirname + '/../fixtures/test-provinces.csv');
fixtures.zipcode = loadFixture(__dirname + '/../fixtures/test-zipcodes.csv', 400);
fixtures.place = loadFixture(__dirname + '/../fixtures/test-places.csv', 200);

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
            if (results.length > 40) results = results.substr(0,40) + '...';
            console.warn('  %s => %s', name, results);
        });
    });
}

var context = loadContext(__dirname + '/../fixtures/test-context.csv');
describe('context', function() {
    var stats = {
        start: + new Date,
        total: 0,
        okay: 0,
        failed: {}
    };
    _(context).each(function(row) {
        it(row.query, function(done) {
            carmen.geocode(row.query, function(err, res) {
                assert.ifError(err);
                stats.total++;
                var names = _(res.results[0]).chain()
                    .pluck('name')
                    .value();
                var inResults = _(row.result).isEqual(names);
                if (inResults) {
                    stats.okay++;
                } else {
                    stats.failed.context = stats.failed.context || {};
                    stats.failed.context[row.query] = names;
                }
                done();
            });
        });
    });
    after(function() {
        summary('context', stats, true);
    });
});

_(fixtures).each(function(fixture, type) {
    if (!carmen.indexes[type] || !carmen.indexes[type].query) return;

    describe('geocode ' + type, function() {
        var stats = {
            start: + new Date,
            total: 0,
            okay: 0,
            failed: {}
        };
        _(fixture).each(function(row) {
            it(row.name, function(done) {
                carmen.geocode(row.name, function(err, res) {
                    assert.ifError(err);
                    stats.total++;
                    var inResults = _(res.results).chain()
                        .pluck('0')
                        .any(function(r) { return okay(type, r, row) })
                        .value();
                    if (inResults) {
                        stats.okay++;
                    } else {
                        stats.failed[type] = stats.failed[type] || {};
                        stats.failed[type][row.name] = _(res.results).chain()
                            .pluck('0')
                            .map(function(r) { return r.type + '.' + r.name })
                            .uniq()
                            .value();
                    }
                    done();
                });
            });
        });
        after(function() {
            summary('geocode ' + type, stats);
        });
    });
});

_(fixtures).each(function(fixture, type) {
    if (!carmen.indexes[type] || !carmen.indexes[type].context) return;

    describe('reverse', function() {
        var stats = {
            start: + new Date,
            total: 0,
            okay: 0,
            failed: {}
        };
        _(fixture).each(function(row) {
            var coords = row.lon +','+ row.lat;
            it(coords, function(done) {
                carmen.geocode(coords, function(err, res) {
                    assert.ifError(err);
                    stats.total++;

                    var inResults = _(res.results[0]).chain()
                        .any(function(r) { return row.name == r.name })
                        .value();
                    if (inResults) {
                        stats.okay++;
                    } else {
                        stats.failed[type] = stats.failed[type] || {};
                        stats.failed[type][row.name] = _(res.results[0]).chain()
                            .map(function(r) { return r.type + '.' + r.name })
                            .uniq()
                            .value();
                    }
                    done();
                });
            });
        });
        after(function() {
            summary('reverse ' + type, stats);
        });
    });
});
