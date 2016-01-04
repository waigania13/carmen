#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var argv = process.argv;
var Carmen = require('../index.js');
var argv = require('minimist')(process.argv, {
    string: [ 'version', 'config', 'input', 'output', 'index' ],
    boolean: [ 'help' ]
});
var settings = require('../package.json');

if (argv.help) {
    console.log('carmen-copy.js --config=<path> --index=<path> [options]');
    console.log('[options]:');
    console.log('  --help                  Prints this message');
    console.log('  --version               Print the carmen version');
    console.log('  --config="<path>"       Path to JSON document with index settings');
	console.log('  --index="<path>"        Tilelive path to output index to');
    console.log('  --ouput="<path>"        Path to output Normalized GeoJSON to');
    console.log('                            If unset outputs to STDOUT');
    console.log('  --input="<path>"        File containing GeoJSON FeatureCollection to index');
    console.log('                            If unset waits for FeatureCollection from STDIN');

    process.exit(0);
}

if (argv.version) {
    console.log('carmen@'+settings.version);
    process.exit(0);
}

if (!argv.config) throw new Error('--settings argument required');

var inputStream; //STDIN (default) or fs readStream w/ GeoJSON FeatureCollection
var outputStream; //STOUT (default) or fs writeStream

if (argv.output) {
    outputStream = fs.createWriteStream(path.resolve(process.cwd(), argv.output));
} else {
    outputStream = process.stdout;
}

if (argv.input) {
    inputStream = fs.createReadStream(path.resolve(process.cwd(), argv._[0]), { encoding: 'utf8' });
} else {
    process.stdin.setEncoding('utf8');
    process.stdin.resume();
    inputStream = process.stdin;
}

argv.index = Carmen.auto(argv.index);

var conf = {
	config: require(), //TODO require JSON index config
	index: argv.index,
	input: inputStream,
	ouput: outputStream
};


//OLD CODE TO REVIEW

var carmen = new Carmen(conf);
var last = +new Date;
var total = 0;

carmen.on('index', function(num) {
    console.log('Indexed %s docs @ %s/s', num, Math.floor(num * 1000 / (+new Date - last)));
    last = +new Date;
});
carmen.on('store', function(num) {
    last = +new Date;
});
carmen.index(conf.from, conf.to, {nogrids:nogrids}, function(err) {
    if (err) throw err;
    console.log('Stored in %ss', Math.floor((+new Date - last) * 0.001));
    console.log('Done.');
    process.exit(0);
});
