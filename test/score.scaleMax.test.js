var test = require('tape');
var score = require('../lib/util/score');

test('scale score to allowed max', function(t) {
    var allowed = score.scaleMax(1000, {
        max: 1500,
        allowedMax: 800
    });
    t.equal(allowed, 718);
    t.end();
});