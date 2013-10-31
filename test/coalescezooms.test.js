var assert = require('assert'),
    coalesceZooms = require('../lib/pure/coalescezooms');

describe('coalesce zooms', function() {
    it('zero case', function() {
        var coalesced = coalesceZooms([], [], {}, [], {});
        assert.deepEqual(coalesced, {});
    });
});
