var _ = require('underscore');
var fs = require('fs');
var assert = require('assert');
var util = require('util');
var Carmen = require('..');
var tokenize = require('../lib/util/termops').tokenize;
var MBTiles = require('mbtiles');

var carmen = new Carmen({
    country: new MBTiles(__dirname + '/../tiles/01-ne.country.mbtiles', function(){}),
    province: new MBTiles(__dirname + '/../tiles/02-ne.province.mbtiles', function(){}),
    place: new MBTiles(__dirname + '/../tiles/04-mb.place.mbtiles', function(){})
});

function okay(type, a, b, margin) {
    margin = margin || 0.01;
    var typecheck = type === 'place' ?
        a.type === b.type :
        a.type === type;
    return typecheck &&
        a.name === b.name &&
        (a.lon >= b.lon - margin) &&
        (a.lon <= b.lon + margin) &&
        (a.lat >= b.lat - margin) &&
        (a.lat <= b.lat + margin);
}

describe('geocode corner cases', function(done) {

    var corner = JSON.parse(fs.readFileSync('./test/fixtures/corner.json'));

    before(function(done) {
        carmen._open(function(err) {
            assert.ifError(err);
            done();
        });
    });

    describe('place variations', function() {
        corner.forEach(function(c) {
            it(c.query, function(done) {
                carmen.geocode(c.query, {}, function(err, res) {
                    assert.ok(res, 'should give results');
                    assert.deepEqual(res.features[0].place_name, c.result.names);
                    done();
                });
            });
        });
    });
});
