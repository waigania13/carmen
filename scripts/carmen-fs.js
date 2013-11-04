#!/usr/bin/env node

var argv = require('minimist')(process.argv);

if (!argv.query) {
    console.log('Usage: carmen.js --query="<query>"');
    process.exit(1);
}

var dirname = process.env.CARMEN_DIR || (__dirname + '/../tiles');

var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var Carmen = require('../index');
var opts = Carmen.autoSync(path.resolve(dirname));
var carmen = new Carmen(opts);

if (!argv.query) throw new Error('--query argument required');

carmen.geocode(argv.query, function(err, data) {
    if (err) throw err;
    var texts = data.results.reduce(function(memo, r) {
        var text = r.map(function(_) { return _.name; }).join(', ');
        if (!memo[text]) memo[text] = 0;
        memo[text]++;
        return memo;
    }, {});
    var keys = Object.keys(texts);
    if (keys.length) {
        console.log('Result (showing %s of %s)', keys.slice(0,10).length, keys.length);
        console.log('-----------------------');
        keys.slice(0,10).forEach(function(key) {
            console.log('- %s %s', key, texts[key] > 1 ? 'x' + texts[key] : '');
        });
        console.log('');
    }
    if (process.env.DEBUG) Object.keys(opts).forEach(function(dbname) {
        var stats = data.stats['search.'+dbname];
        if (!stats) return;
        console.log('- search.%s', dbname);
        for (var phase in stats) {
            console.log('  - %s %s => %s @ %s ms', rpad(phase,8), stats[phase][0], stats[phase][1], stats[phase][2]);
        }
    });
});

function rpad(str, len) {
    if (typeof str !== 'string') str = str.toString();
    while (str.length < len) str = str + ' ';
    return str;
}
