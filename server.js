#!/usr/bin/env node

var express = require('express');
var server = express.createServer();
var Carmen = require('./index.js');
var MBTiles = Carmen.MBTiles();

var carmen = new Carmen({
    country: {
        source: new MBTiles(__dirname + '/tiles/ne-countries.mbtiles',function(){})
    },
    province: {
        source: new MBTiles(__dirname + '/tiles/ne-provinces.mbtiles',function(){})
    },
    place: {
        source: new MBTiles(__dirname + '/tiles/osm-places.mbtiles',function(){})
    }
});

server.get('/geocode/:query', function(req, res, next) {
    if (!req.param('query')) return res.send(404);
    console.time('geocode ' + req.param('query'));
    carmen.geocode(req.param('query'), function(err, data) {
        console.timeEnd('geocode ' + req.param('query'));
        if (err) return next(err);
        res.send(data);
    });
});

server.use(express['static'](__dirname + '/static'));

server.listen(3000);
console.log('carmen: http://localhost:3000')
