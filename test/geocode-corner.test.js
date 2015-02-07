var fs = require('fs');
var util = require('util');
var Carmen = require('..');
var tokenize = require('../lib/util/termops').tokenize;
var MBTiles = require('mbtiles');
var test = require('tape');

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

test('geocode corner cases', function(t) {

    var corner = JSON.parse(fs.readFileSync(__dirname + '/fixtures/corner.json'));

    t.test('geocoder-open?', function(q) {
        carmen._open(function(err) {
            q.ifError(err);
            q.end();
        });
    });

    t.test('place variations', function(q) {
        corner.forEach(function(c) {
            carmen.geocode(c.query, {}, function(err, res) {
                q.ok(res, 'should give results');
                q.deepEqual(res.features[0].place_name, c.result.names);
            });
        });
        q.end();
    });
});
