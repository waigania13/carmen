#!/usr/bin/env node

if (!process.argv[2]) {
    console.log('Usage: carmen.js "<query>"');
    process.exit(1);
}

var dirname = process.env.CARMEN_DIR || (__dirname + '/../tiles');

var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var Carmen = require('../index');
var opts = Carmen.autoSync(path.resolve(dirname));
var carmen = new Carmen(opts);
var queue = require('queue-async');
var query = process.argv.slice(2).join(' ');

var queries = [];
for (var i = 0; i < 10000; i++) {
    queries.push(query);
}

var q = queue(10);

console.time('rounds');

queries.forEach(function(query) {
    q.defer(function(_, cb) {
        carmen.geocode(_, cb);
    }, query);
});

q.awaitAll(function(errs, results) {
    console.timeEnd('rounds');
});
