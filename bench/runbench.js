var fs = require('fs');
var q = require('queue-async')(1);

var files = fs.readdirSync(__dirname);

process.env.runSuite = true;

console.log('Benchmarking...');

files.forEach(function(d) {
    if (['expected', 'fixtures', 'runbench.js'].indexOf(d) >= 0) return;
    q.defer(require('./'+d));
});

q.awaitAll(function(err, data){
    console.log('Benchmarking complete');
    // do something with data
});
