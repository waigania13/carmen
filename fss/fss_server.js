#!/usr/bin/env node

var fss = require('./lib/_fss.node');
var assert = require('assert');
var express = require('express');
var server = express.createServer();
var fss_engine = new fss.Engine();

fss_engine.add({file:'/Users/artem/Projects/fss/data/geonames-fixed',distance:2});

server.get('/fss/:query', function(req, res, next)
{
    if (!req.param('query')) return res.send(404);
    console.log(req.param('query'));
    console.time('fss ' + req.param('query'));
    var result = fss_engine.search({query:req.param('query'), distance:2, num_results:10});
    res.send(result);
});

server.use(express['static'](__dirname + '/static'));

server.listen(3001);
console.log('carmen fss: http://localhost:3001')
