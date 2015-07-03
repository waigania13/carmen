var stackable = require('../lib/spatialmatch.js').stackable;
var test = require('tape');

test('stackable simple', function(assert) {
    var a1 = { text:"a1", idx:0, zoom:0, mask:parseInt('10',2), weight:0.5 };
    var a2 = { text:"a2", idx:0, zoom:0, mask:parseInt('10',2), weight:0.5 };
    var b1 = { text:"b1", idx:1, zoom:1, mask:parseInt('1',2), weight:0.5 };
    var b2 = { text:"b2", idx:1, zoom:1, mask:parseInt('1',2), weight:0.5 };
    var debug = stackable([
        [ a1 ],
        [ b1, b2 ],
    ]).map(function(stack) {
        return stack.map(function(s) { return s.text });
    });
    assert.deepEqual(debug, [
        [ 'a1', 'b1' ],
        [ 'a1', 'b2' ]
    ]);
    assert.end();
});

test('stackable complex', function(assert) {
    var a1 = { text:"a1", idx:0, zoom:0, mask:parseInt('10',2), weight:0.33 };
    var a2 = { text:"a2", idx:0, zoom:0, mask:parseInt('110',2), weight:0.66 };
    var b1 = { text:"b1", idx:1, zoom:1, mask:parseInt('1',2), weight:0.33 };
    var b2 = { text:"b2", idx:1, zoom:1, mask:parseInt('100',2), weight:0.33 };
    var c1 = { text:"c1", idx:1, zoom:1, mask:parseInt('1',2), weight:0.33 };
    var c2 = { text:"c2", idx:1, zoom:1, mask:parseInt('100',2), weight:0.33 };
    var debug = stackable([
        [ a1, a2 ],
        [ b1, b2 ],
        [ c1, c2 ],
    ]).map(function(stack) {
        return stack.relev.toFixed(2) + ' - ' + stack.map(function(s) { return s.text }).join(', ');
    });
    assert.deepEqual(debug, [
        '1.00 - a2, b1',
        '1.00 - a2, c1',
        '1.00 - a1, b1, c2',
        '1.00 - a1, b2, c1',
        '0.67 - a1, c1',
        '0.67 - a1, c2',
        '0.67 - a1, b1',
        '0.67 - a1, b2',
        '0.67 - b2, c1',
        '0.67 - b1, c2',
        '0.66 - a2'
    ]);
    assert.end();
});

