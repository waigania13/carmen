var fs = require('fs');
var q = require('queue-async')(1);

var files = fs.readdirSync(__dirname);

process.env.runSuite = true;

files.forEach(function(d) {
    if (d === 'expected' || d === 'fixtures' || d === 'runbench.js') return;
    q.defer(require('./'+d));
});

q.awaitAll(function(err, data){
    console.log('benchmarking complete');
    // do something with data
});
