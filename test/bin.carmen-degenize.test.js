var fs = require('fs');
var path = require('path');
var tape = require('tape');
var spawn = require('child_process').spawn;
var tmpdir = require('os').tmpdir();
var bin = path.resolve(path.join(__dirname, '..', 'scripts'));

var Carmen = require('../index.js');
var MBTiles = require('mbtiles');
var Memsource = require('../lib/api-mem');
var tmpindex = path.join(tmpdir, 'test-carmen-index.mbtiles');
var addFeature = require('../lib/util/addfeature');

tape('carmen-degenize', function(assert) {
    var child = spawn(__dirname + '/../scripts/carmen-degenize.js', []);
    var data = [];
    child.stdout.on('data', function(d) {
        data = data.concat(d.toString().split('\n'));
    });
    child.stderr.on('data', function(data) {
        assert.ifError(data);
    });
    child.on('close', function(code) {
        assert.deepEqual(data, [
            'm',
            'ma',
            'mai',
            'main',
            'main s',
            'main st',
            'main str',
            'main stre',
            'main stree',
            'main street',
            'w',
            'wa',
            'wal',
            'wall',
            'wall s',
            'wall st',
            'wall str',
            'wall stre',
            'wall stree',
            'wall street'
        ], 'emits degenified lines of text');
        assert.equal(code, 0, 'exits 0');
        assert.end();
    });
    child.stdin.write('Main Street\n');
    child.stdin.write('Wall Street\n');
    child.stdin.write('\n');
    child.stdin.end();
});

