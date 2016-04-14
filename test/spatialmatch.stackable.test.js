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

// test('stackable nmask', function(assert) {
//     var a1 = { text:"a1", idx:0, zoom:1, mask:parseInt('100',2), nmask:parseInt('1',2), weight:0.33 };
//     var b1 = { text:"b1", idx:1, zoom:1, mask:parseInt('10',2), nmask:parseInt('10',2), weight:0.33 };
//     var c1 = { text:"c1", idx:2, zoom:1, mask:parseInt('1',2), nmask:parseInt('10',2), weight:0.33 };
//     var debug = stackable([
//         [ a1 ],
//         [ b1 ],
//         [ c1 ],
//     ]).map(function(stack) {
//         return stack.map(function(s) { return s.text });
//     });
//     assert.deepEqual(debug, [
//         [ 'c1', 'a1' ],
//         [ 'b1', 'a1' ],
//     ], 'b1 and c1 do not stack (nmask: same geocoder_name)');
//     assert.end();
// });

test('stackable nmask for cross streets', function(assert) {
    var a1 = { text:'fake', idx:0, zoom:1, mask:parseInt('01',2), nmask:parseInt('1',2), weight:0.5 };
    var b1 = { text:'main', idx:0, zoom:1, mask:parseInt('10',2), nmask:parseInt('1',2), weight:0.5 };
    var debug = stackable([
        [ a1 ],
        [ b1 ],
    ]).map(function(stack) {
        return stack.map(function(s) { return s.text });
    });
    assert.deepEqual(debug, [
        [ 'fake', 'main' ],
    ], 'b1 and a1 can stack');
    assert.end();
});

test('stackable bmask', function(assert) {
    var a1 = { text:"a1", idx:0, zoom:1, mask:parseInt('100',2), bmask:[0,1], weight:0.66 };
    var b1 = { text:"b1", idx:1, zoom:1, mask:parseInt('10',2), bmask:[1,0], weight:0.66 };
    var debug = stackable([
        [ a1 ],
        [ b1 ],
    ]).map(function(stack) {
        return stack.map(function(s) { return s.text });
    });
    assert.deepEqual(debug, [
        [ 'a1' ],
        [ 'b1' ],
    ], 'a1 and b1 do not stack (bmask: exclusive bounds)');
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
        '0.99 - a2, c1',
        '0.99 - a2, b1',
        '0.66 - a2',
        // '1.00 - a1, b1, c2', => mask goes backwards
        // '1.00 - a1, b2, c1', => mask goes backwards
        // '0.66 - a1, c2', => mask goes backwards
        // '0.66 - a1, b2', => mask goes backwards
        // '0.66 - b1, c2', => mask goes backwards
        '0.66 - b2, c1',
        '0.66 - a1, c1',
        '0.66 - a1, b1',
    ]);
    assert.end();
});

