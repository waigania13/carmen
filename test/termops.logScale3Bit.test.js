var test = require('tape');
var termops = require('../lib/util/termops');

test('encode', function(t) {
	var term = 0;
	term = termops.encode3BitLogScale(3566,180000);
	t.equal(term, 5);
	t.end();
});

test('decode', function(t) {
	var term = 0;
	term = termops.decode3BitLogScale(5,180000);
	t.equal(term, 5672);
	t.end();
});

