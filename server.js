#!/usr/bin/env node

var express = require('express');
var server = express.createServer();
var carmen = new (require('./index.js'))();

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
