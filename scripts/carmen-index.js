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
	console.log('Deprecated:');
    console.log('carmen-copy.js [from] [to]');
    process.exit(0);
}

if (argv.version) {
    console.log('carmen@'+settings.version);
    process.exit(0);
}


//New Streaming
if (!argv._[2]) {
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
		to: argv.index
	};

	var carmen = new Carmen(conf);

	carmen.index(null, conf.index, {}, complete);
} else {
	//Legacy Indexer
	if (!argv._[2]) throw new Error('[From] argument required');
	if (!argv._[3]) throw new Error('[To] argument required');

	var from = argv._[2];
	var to = argv._[3]

	var conf = {
		to: to,
		from: from
	};

	var carmen = new Carmen(conf);

	carmen.index(conf.from, conf.to, {}, complete);
}

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
