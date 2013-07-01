#!/usr/bin/env node

var express = require('express');
var server = express.createServer();
var MBTiles = require('./api-mbtiles');
var Carmen = require('./index.js');

var carmen = new Carmen({
    country: new MBTiles(__dirname + '/tiles/ne-countries.mbtiles', function(){}),
    province: new MBTiles(__dirname + '/tiles/ne-provinces.mbtiles', function(){}),
    zipcode: new MBTiles(__dirname + '/tiles/tiger-zipcodes.mbtiles', function(){}),
    place: new MBTiles(__dirname + '/tiles/mb-places.mbtiles', function(){}),
    street: new MBTiles(__dirname + '/tiles/osm-streets-dc.mbtiles', function(){})
});

server.get('/geocode/:query', function(req, res, next) {
    if (!req.param('query')) return res.send(404);
    console.time('geocode ' + req.param('query'));
    carmen.geocode(req.param('query'), function(err, data) {
        console.timeEnd('geocode ' + req.param('query'));
        if (err) return next(err);
        // @TODO ...
        if (data.stats.score < 0.5) data.results = [];
        res.send(data);
    });
});

server.use(express['static'](__dirname + '/static'));

server.listen(3000);
console.log('carmen: http://localhost:3000')
