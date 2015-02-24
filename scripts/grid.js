#!/usr/bin/env node

if (!process.argv[2]) {
    console.error('Usage: grid.js --query="<query>" --[from|to]');
    console.error('-----');
    console.error('./grid.js --from --query="grid"');
    console.error('./grid.js --to   --query="id/x/y"');
    console.error('z not included in grid (must be derived from each source)');
    process.exit(1);
}

var opts = require('../lib/util/ops');

var argv = require('minimist')(process.argv, {
    'string': [ 'query' ],
    'boolean':[ 'to', 'from' ]
});

if (!argv.to && !argv.from) {
    console.error('--to or --from arg required');
    proces.exit(1);
} else if (!argv.query) {
    console.error('--query arg required');
    process.exit(1);
}

if (argv.to) to();
else from();

function to() {
    zxy = argv.query.split('/');
    if (zxy.length !== 3) {
        console.error('query must be in the form "id/x/y"');
        process.exit(1);
    }
    id = zxy.shift();
    console.log(opts.zxy(id, '0/'+ zxy[0]+ '/' +zxy[1] ));
}

function from() {
    var grid = parseInt(argv.query);
    console.log(opts.grid(grid));
}
