#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var argv = process.argv;
var Carmen = require('../index.js');
var argv = require('minimist')(process.argv, {
    string: [ 'version', 'config', 'index' ],
    boolean: [ 'help' ]
});
var settings = require('../package.json');

function help() {
    console.log('carmen-copy.js --config=<path> --index=<path> [options]');
    console.log('[options]:');
    console.log('  --help                  Prints this message');
    console.log('  --version               Print the carmen version');
    console.log('  --config="<path>"       path to JSON document with index settings');
    console.log('  --index="<path>"        Tilelive path to output index to');
    console.log('');
    console.log('Deprecated:');
    console.log('carmen-copy.js [from] [to]');
    process.exit(0);
}

if (argv.help) help();

if (argv.version) {
    console.log('carmen@'+settings.version);
    process.exit(0);
}

//New Streaming
if (!argv._[2]) {
    if (!argv.config) help();
    if (!argv.index) throw new Error('--index argument required');

    var outputStream = process.stdout;

    var conf;
    var config = JSON.parse(fs.readFileSync(argv.config, 'utf8'));

    argv.index = Carmen.auto(argv.index, function() {
        conf = {
            to: argv.index
        };
        conf.to.startWriting(writeMeta);
    });

    function writeMeta(err) {
        if (err) throw err;
        conf.to.putInfo(config, stopWriting);
    }

    function stopWriting(err) {
        if (err) throw err;
        conf.to.stopWriting(index);
    }

    function index(err) {
        if (err) throw err;
        var carmen = new Carmen(conf);
        carmen.on('open', function() {
            carmen.index(null, conf.to, {
                input: process.stdin,
                output: outputStream,
                config: config
            }, function(err) {
                if (err) throw err;
                process.exit(0);
            });
        });
    }
} else {
    //Legacy Indexer
    if (!argv._[2]) throw new Error('[From] argument required');
    if (!argv._[3]) throw new Error('[To] argument required');

    var from = argv._[2];
    var to = argv._[3]

    var conf = {
        to: Carmen.auto(to),
        from: Carmen.auto(from)
    };

    var carmen = new Carmen(conf);

    carmen.index(conf.from, conf.to, {}, complete);

    var last = +new Date;
    var total = 0;

    carmen.on('index', function(num) {
        console.log('Indexed %s docs @ %s/s', num, Math.floor(num * 1000 / (+new Date - last)));
        last = +new Date;
    });
    carmen.on('store', function(num) {
        last = +new Date;
    });

    function complete(err) {
        if (err) throw err;
        console.log('Stored in %ss', Math.floor((+new Date - last) * 0.001));
        console.log('Done.');
        process.exit(0);
    }
}
