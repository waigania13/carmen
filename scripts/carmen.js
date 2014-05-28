#!/usr/bin/env node

if (!process.argv[2]) {
    console.log('Usage: carmen.js [file|dir] --query="<query>"');
    process.exit(1);
}

var fs = require('fs');
var path = require('path');
var Carmen = require('../index');
var argv = require('minimist')(process.argv, {
    string: 'proximity',
    string: 'query',
    boolean: 'geojson',
    boolean: 'stats',
    boolean: 'help'
});

if (argv.help) {
    console.log('carmen.js --query="<query>" [options]');
    console.log('[options]:');
    console.log('  --proximity="lat,lng"   Favour results by proximity');
    console.log('  --geojson               Return a geojson object');
    console.log('  --stats                 Generate Stats on the query');
    console.log('  --help                  Print this report');
    process.exit(0);
}

if (!argv.query) throw new Error('--query argument required');

var opts = {};
if (argv._.length > 2) { //Given Tile Source
    var src = path.resolve(argv._[argv._.length-1]);
    var stat = fs.statSync(src);
    if (stat.isDirectory()) {
        opts = Carmen.autodir(src);
    } else {
        opts[path.basename(src)] = Carmen.auto(src);
    }
} else { //Default Tile Source
    opts = Carmen.autodir(path.resolve(__dirname + '/../tiles'));
}

var carmen = new Carmen(opts);

if (argv.proximity) {
    if (argv.proximity.indexOf(',') === -1)
        throw new Error("Proximity must be lat,lon");
    argv.proximity.split(',');
}

var load = +new Date();
carmen.geocode(argv.query, { 'proximity': argv.proximity }, function(err, data) {
    if (err) throw err;

    load = +new Date() - load;
    carmen.geocode(argv.query, { 'proximity': argv.proximity, stats:true }, function(err, data) {
        if (err) throw err;
        if (data.features.length && !argv.geojson) {
            console.log('Tokens');
            console.log('------');
            console.log(data.query.join(', '));
            console.log('');
            console.log('Features');
            console.log('--------');
            data.features.forEach(function(f) {
                console.log('- %s %s (%s)', f.relevance.toFixed(2), f.place_name, f.id.split('.')[0]);
            });
            console.log('');
        }
        if (data.features.length && argv.geojson) {
            console.log(JSON.stringify(data, null, 2));
        }
        if (!argv.stats) return;
        console.log('Stats');
        console.log('-----');
        console.log('- warmup:    %sms', load);
        console.log('- search:    %s @ %sms', data.stats.searchCount||0, data.stats.searchTime||0);
        console.log('- relev:     %s @ %sms', data.stats.relevCount||0, data.stats.relevTime||0);
        console.log('- results:   %s @ %sms', data.stats.contextCount||0, data.stats.contextTime||0);
        console.log('- totaltime: %sms', data.stats.totalTime||0);

        console.log('Cache');
        console.log('-----');
        var cachestats = {term:0,phrase:0,grid:0,degen:0,total:0};
        Object.keys(carmen.indexes).forEach(function(source) {
            source = carmen.indexes[source];
            Object.keys(cachestats).forEach(function(key) {
                var count = source._geocoder.list(key).length;
                cachestats[key] += count;
                cachestats.total += count;
            });
        });
        console.log('- degen:     %s', cachestats.degen);
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
}
