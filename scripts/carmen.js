#!/usr/bin/env node

if (!process.argv[2]) {
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
var argv = require('minimist')(process.argv, {
    string: 'query'
});

if (!argv.query) throw new Error('--query argument required');

var load = +new Date;
carmen.geocode(argv.query, {}, function(err, data) {
    if (err) throw err;
    load = +new Date - load;
    var time = +new Date;
    carmen.geocode(argv.query, { stats:true }, function(err, data) {
        time = +new Date - time;
        if (err) throw err;
        var texts = data.results.reduce(function(memo, r) {
            var text = r.map(function(_) { return _.name; }).join(', ');
            if (!memo[text]) memo[text] = 0;
            memo[text]++;
            return memo;
        }, {});
        var keys = Object.keys(texts);
        console.log('Tokens')
        console.log('------')
        console.log(data.query.join(', '));
        console.log('');
        if (keys.length) {
            console.log('Result (showing %s of %s)', keys.slice(0,10).length, keys.length);
            console.log('-----------------------');
            keys.slice(0,10).forEach(function(key) {
                console.log('- %s %s', key, texts[key] > 1 ? 'x' + texts[key] : '');
            });
            console.log('');
        }
        console.log('Stats');
        console.log('-----');
        console.log('- warmup:    %sms', load);
        console.log('- search:    %s @ %sms', data.stats.searchCount||0, data.stats.searchTime||0);
        console.log('- relev:     %s @ %sms', data.stats.relevCount||0, data.stats.relevTime||0);
        console.log('- results:   %s @ %sms', data.stats.contextCount||0, data.stats.contextTime||0);
        console.log('- relevance: %s', data.stats.relev);
        console.log('- totaltime: %sms', time);

        console.log('Cache');
        console.log('-----');
        var cachestats = {freq:0,term:0,phrase:0,grid:0,degen:0,total:0};
        _(carmen.indexes).each(function(source, name) {
            _(cachestats).each(function(sum, key) {
                var count = source._geocoder.list(key).length;
                cachestats[key] += count;
                cachestats.total += count;
            });
        });
        console.log('- degen:     %s', cachestats.degen);
        console.log('- freq:      %s', cachestats.freq);
        console.log('- term:      %s', cachestats.term);
        console.log('- phrase:    %s', cachestats.phrase);
        console.log('- grid:      %s', cachestats.grid);
        console.log('- total:     %s', cachestats.total);
        if (process.env.DEBUG) Object.keys(opts).forEach(function(dbname) {
            var stats = data.stats['search.'+dbname];
            if (!stats) return;
            console.log('- search.%s', dbname);
            for (var phase in stats) {
                console.log('  - %s %s => %s @ %s ms', rpad(phase,8), stats[phase][0], stats[phase][1], stats[phase][2]);
            }
        });
    });
});

function rpad(str, len) {
    if (typeof str !== 'string') str = str.toString();
    while (str.length < len) str = str + ' ';
    return str;
};
