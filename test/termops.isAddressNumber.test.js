const termops = require('../lib/util/termops');
const test = require('tape');

test('termops.isAddressNumber', (t) => {
    t.deepEqual(termops.isAddressNumber(['12345']), false, '12345');
    t.deepEqual(termops.isAddressNumber(['1####']), true, '1####');
    t.deepEqual(termops.isAddressNumber(['#####']), true, '#####');
    t.deepEqual(termops.isAddressNumber(['12345 Main St']), false, '12345 Main St');
    t.deepEqual(termops.isAddressNumber(['1#### Main St']), false, '1#### Main St');
    t.deepEqual(termops.isAddressNumber(['##### Main St']), false, '##### Main St');

    t.end();
});

