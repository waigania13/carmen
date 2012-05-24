var _ = require('underscore');
var fs = require('fs');
var assert = require('assert');
var util = require('util');
var carmen = new (require('..'))();

function okay(type, a, b) {
    var margin = 0.01;
    return a.type === type &&
        a.name === b.name &&
        (a.lon >= b.lon - margin) &&
        (a.lon <= b.lon + margin) &&
        (a.lat >= b.lat - margin) &&
        (a.lat <= b.lat + margin);
};

function loadFixture(path) {
    return _(fs.readFileSync(path, 'utf8').split('\n')).chain()
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
};

var fixtures = {};
fixtures.country = loadFixture(__dirname + '/countries.csv');
fixtures.province = loadFixture(__dirname + '/provinces.csv');
// fixtures.city = loadFixture(__dirname + '/cities.csv');

describe('geocode', function() {
    var stats = {
        start: + new Date,
        total: 0,
        okay: 0,
        failed: {}
    };
    _(fixtures).each(function(fixture, type) {
        _(fixture).each(function(row) {
            it(row.name, function(done) {
                carmen.geocode(row.name, function(err, res) {
                    assert.ok(!err);
                    stats.total++;
                    if (_(res.results).any(function(r) { return okay(type, r, row) })) {
                        stats.okay++;
                    } else {
                        stats.failed[type] = stats.failed[type] || {};
                        stats.failed[type][row.name] = _(res.results).chain()
                            .map(function(r) { return r.type + '.' + r.name })
                            .uniq()
                            .value();
                    }
                    done();
                });
            });
        });
    });
    after(function() {
        console.warn('');
        console.warn('  %s% (%s/%s) at %sms/query', (stats.okay/stats.total*100).toFixed(1), stats.okay, stats.total, (((+new Date) - stats.start)/stats.total).toFixed(1));
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
    });
});
