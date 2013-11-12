#!/usr/bin/env node

if (!process.argv[2]) {
    console.log('Usage: context.js lon lat');
    process.exit(1);
}

var dirname = process.env.CARMEN_DIR || (__dirname + '/../tiles');

var fs = require('fs');
var path = require('path');
var Carmen = require('../index');
var opts = Carmen.autoSync(path.resolve(dirname));
var carmen = new Carmen(opts);
var argv = require('minimist')(process.argv);

carmen.context(parseFloat(argv.lon), parseFloat(argv.lat), null, done);

function done(err, data) {
    if (err) throw err;
    console.log(JSON.stringify(data, null, 2));
}
