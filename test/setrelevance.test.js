var getSetRelevance = require('../lib/pure/setrelevance');
var test = require('tape');

test('getSetRelevance', function(t) {
    // No matches.
    t.equal(0.0, getSetRelevance(['georgia','vermont'], []));
    // Relev 1 match for 1 of 2 terms.
    t.equal(0.5, getSetRelevance(['georgia','vermont'], [
        { id: 153, relev: 1, reason: 1, count: 1, idx: 0, db: 'country', tmpid: 153 }
    ]));
    // Relev 1 match for 2 of 2 terms.
    t.equal(1, getSetRelevance(['georgia','vermont'], [
        { id: 3553, relev: 1, reason: 2, count: 1, idx: 1, db: 'province', tmpid: 100000000003553 },
        { id: 130305, relev: 1, reason: 1, count: 1, idx: 2, db: 'place', tmpid: 300000000130305 }
    ]));
    // Relev penalized for 2 of 2 terms, but with a gap in db index.
    t.equal(0.99, getSetRelevance(['georgia','vermont'], [
        { id: 3553, relev: 1, reason: 2, count: 1, idx: 1, db: 'province', tmpid: 100000000003553 },
        { id: 130305, relev: 1, reason: 1, count: 1, idx: 3, db: 'place', tmpid: 300000000130305 }
    ]));
    // Second match for the same reason does not contribute to final relevance.
    t.equal(0.5, getSetRelevance(['georgia','vermont'], [
        { id: 153, relev: 1, reason: 1, count: 1, idx: 0, db: 'country', tmpid: 153 },
        { id: 130305, relev: 1, reason: 1, count: 1, idx: 3, db: 'place', tmpid: 300000000130305 }
    ]));
    // Second match with the same DB does not contribute to final relevance.
    t.equal(0.5, getSetRelevance(['georgia','vermont'], [
        { id: 130305, relev: 1, reason: 1, count: 1, idx: 3, db: 'place', tmpid: 300000000130305 },
        { id: 8062, relev: 1, reason: 2, count: 1, idx: 3, db: 'place', tmpid: 300000000008062 }
    ]));
    // Repeated terms with fittable counts/db indexes.
    t.equal(1, getSetRelevance(['new','york','new','york'], [
        { id: 1, relev: 1, reason: 15, count: 2, idx: 2, db: 'province', tmpid: 300000000000001 },
        { id: 2, relev: 1, reason: 15, count: 2, idx: 3, db: 'place', tmpid: 300000000000002 }
    ]));
    // Repeated terms but match counts are exhausted.
    t.equal(0.5, getSetRelevance(['new','york','new','york','new','york','new','york'], [
        { id: 1, relev: 1, reason: 255, count: 2, idx: 2, db: 'province', tmpid: 300000000000001 },
        { id: 2, relev: 1, reason: 255, count: 2, idx: 3, db: 'place', tmpid: 300000000000002 }
    ]));
    // Test that elements of the stack without contribution are set to false.
    var stack = [
        { id: 3553, relev: 1, reason: 2, count: 1, idx: 1, db: 'province', tmpid: 100000000003553 },
        { id: 1, relev: 1, reason: 255, count: 2, idx: 1, db: 'province', tmpid: 300000000000001 },
        { id: 130305, relev: 1, reason: 1, count: 1, idx: 2, db: 'place', tmpid: 300000000130305 },
        { id: 2, relev: 1, reason: 255, count: 2, idx: 3, db: 'venue', tmpid: 300000000000002 }
    ];
    t.equal(1, getSetRelevance(['georgia','vermont'], stack));
    t.equal(!!stack[0], true, 'province 0 set');
    t.equal(stack[1], false, 'province 1 false');
    t.equal(!!stack[2], true, 'place 0 set');
    t.equal(!!stack[3], true, 'venue 0 set');
    t.end();
});
