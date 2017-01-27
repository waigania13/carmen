var termops = require('../lib/util/termops');
var test = require('tape');

test('tokenizes Japanese strings containing CJK characters', function(assert) {
    assert.deepEqual(termops.segmentWords('岐阜県中津川市馬籠'), ['岐阜県', '中津', '川市', '馬', '籠']);
    assert.end();
});

test('edge cases - empty string', function(assert) {
    assert.deepEqual(termops.segmentWords(''), []);
    assert.end();
});

test('tokenize Japanese strings with numeric component', function(assert) {
    assert.deepEqual(termops.segmentWords('岐阜県中津川市馬籠4571-1'),  ['岐阜県', '中津', '川市', '馬', '籠', '4571', '-', '1'], 'dashed number at end');
    assert.deepEqual(termops.segmentWords('岐阜県中津川市4571-1馬籠'),  ['岐阜県', '中津', '川市', '4571','-','1','馬','籠'], 'dashed number in middle');
    assert.deepEqual(termops.segmentWords('岐阜県中津川市4571馬籠'),    ['岐阜県', '中津', '川市', '4571', '馬','籠'], 'number in middle');
    assert.deepEqual(termops.segmentWords('岐阜県中津川市4571馬籠123'), ['岐阜県', '中津', '川市', '4571', '馬','籠','123'], 'numbers in middle and at end');
    assert.deepEqual(termops.segmentWords('岐阜県123中津川市4571馬籠'), ['123中津川市4571馬籠'], 'does not split strings that begin with numbers');
    assert.end();
});
