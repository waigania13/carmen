#!/usr/bin/env node

var _ = require('underscore');
var Carmen = require('../index');
var MBTiles = require('../api-mbtiles');
var S3 = require('../api-s3');

var carmen = new Carmen({
    country: new MBTiles(__dirname + '/../tiles/ne-countries.mbtiles', function(){}),
    province: new MBTiles(__dirname + '/../tiles/ne-provinces.mbtiles', function(){}),
    zipcode: new MBTiles(__dirname + '/../tiles/tiger-zipcodes.mbtiles', function(){}),
    place: new MBTiles(__dirname + '/../tiles/mb-places.mbtiles', function(){})
});

carmen.geocode(process.argv[2], function(err, data) {
    if (err) throw err;
    carmen.geocode(process.argv[2], function(err, data) {
        if (err) throw err;
        console.warn(data.query);
        console.warn(data.stats);
        data.results.forEach(function(r) {
            console.log(_(r).pluck('name').join(', '));
        });
    });
});
