var fs = require('fs');
var path = require('path');
var tape = require('tape');
var exec = require('child_process').exec;
var bin = path.resolve(path.join(__dirname, '..', 'scripts'));

tape('bin/carmen', function(t) {
    exec(bin + '/carmen.js', function(err, stdout, stderr) {
        t.equal(1, err.code);
        t.equal("Usage: carmen.js [file|dir] --query=\"<query>\"\n", stdout);
        t.end();
    });
});
tape('bin/carmen query', function(t) {
    exec(bin + '/carmen.js ' + path.resolve(path.join(__dirname, 'fixtures', '01-ne.country.s3')) + ' --query=brazil', function(err, stdout, stderr) {
        t.ifError(err);
        t.equal(/1\.00 Brazil/.test(stdout), true, 'finds brazil');
        t.end();
    });
});

