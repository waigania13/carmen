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
            return { name: p[0], lon: parseFloat(p[1]), lat: parseFloat(p[2]) };
        })
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
        okay: 0
    };
    _(fixtures).each(function(fixture, type) {
        _(fixture).each(function(row) {
            it(row.name, function(done) {
                carmen.geocode(row.name, function(err, res) {
                    assert.ok(!err);
                    stats.total++;
                    if (res.results[0] && okay(type, res.results[0], row)) stats.okay++;
                    done();
                });
            });
        });
    });
    after(function() {
        console.warn('');
        console.warn('  %s% (%s / %s) in %s ms', (stats.okay/stats.total*100).toFixed(1), stats.okay, stats.total, (+new Date) - stats.start);
    });
});
