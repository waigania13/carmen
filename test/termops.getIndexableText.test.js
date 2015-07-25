var termops = require('../lib/util/termops');
var token = require('../lib/util/token');
var test = require('tape');

test('termops.getIndexableText', function(assert) {
    var freq = { 0:[2] };
    var replacer;
    var doc;

    replacer = token.createReplacer({});
    doc = {_text:'Main Street'};
    assert.deepEqual(termops.getIndexableText(replacer, doc), [
        [ 'main', 'street' ]
    ], 'creates indexableText');

    replacer = token.createReplacer({'Street':'St'});
    doc = {_text:'Main Street'};
    assert.deepEqual(termops.getIndexableText(replacer, doc), [
        [ 'main', 'st' ]
    ], 'creates contracted phrases using geocoder_tokens');

    replacer = token.createReplacer({'Street':'St'});
    doc = {_text:'Main Street, main st'};
    assert.deepEqual(termops.getIndexableText(replacer, doc), [
        [ 'main', 'st' ]
    ], 'dedupes phrases');

    replacer = token.createReplacer({'Street':'St', 'Lane':'Ln'});
    doc = {_text:'Main Street Lane'};
    assert.deepEqual(termops.getIndexableText(replacer, doc), [
        [ 'main', 'st', 'ln' ]
    ], 'dedupes phrases');

    replacer = token.createReplacer({'dix-huitième':'18e'});
    doc = {_text:'Avenue du dix-huitième régiment'};
    assert.deepEqual(termops.getIndexableText(replacer, doc), [
        [ 'avenue', 'du', '18e', 'régiment' ]
    ], 'hypenated replacement');

    replacer = token.createReplacer({});
    doc = {_text:'Main Street', _cluster:{1:{}, 10:{}, 100:{}, 200:{}}};
    assert.deepEqual(termops.getIndexableText(replacer, doc), [
        ['main', 'street' ],
        ['2##', 'main', 'street' ],
        ['1##', 'main', 'street' ],
        ['##', 'main', 'street' ],
        ['#', 'main', 'street' ],
    ], 'with range');


    assert.end();
});

