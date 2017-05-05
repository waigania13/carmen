const termops = require('../lib/util/termops');
const test = require('tape');

test('termops.decollide', (t) => {
    t.deepEqual(termops.decollide([], {
        properties: { 'carmen:text': 'main street' }
    }, '## ma'), true, 'decollides "## ma"');

    t.deepEqual(termops.decollide([], {
        properties: { 'carmen:text': 'main street' }
    }, '2# ma'), true, 'decollides "2# ma"');

    t.deepEqual(termops.decollide([], {
        properties: { 'carmen:text': 'main street' }
    }, 'main street 2#'), true, 'decollides "main street 2#"');

    t.deepEqual(termops.decollide([], {
        properties: { 'carmen:text': 'main street' }
    }, 'main 2# street'), false, 'collides "main 2# street"');

    t.deepEqual(termops.decollide([], {
        properties: { 'carmen:text': 'first street' }
    }, '1st'), false, 'finds collision: "1"');

    t.deepEqual(termops.decollide([
        { from: /(\W|^)First(\W|$)/gi, to: '$11st$2' },
    ], {
        properties: { 'carmen:text': 'first street' }
    }, '1st'), true, 'decollides (token replacement)');

    t.deepEqual(termops.decollide([], {
        properties: { 'carmen:text': '京都市' }
    }, '京'), true, 'decollides - unicode');

    t.deepEqual(termops.decollide([], {
        properties: { 'carmen:text': '京都市' }
    }, 'jing'), false, 'decollides - unidecodes');

    t.deepEqual(termops.decollide([], {
        properties: { 'carmen:text': 'main street' }
    }, 'market'), false, 'finds collision: letter "k"');

    t.deepEqual(termops.decollide([], {
        properties: { 'carmen:text': 'Грамада' }
    }, 'грамада'), true, 'decollides - unicode');

    t.deepEqual(termops.decollide([], {
        properties: { 'carmen:text': 'United States', 'carmen:text_es': 'Estados Unidos' }
    }, 'United States'), true, 'decollides - localization');

    t.deepEqual(termops.decollide([], {
        properties: { 'carmen:text': 'United States', 'carmen:text_es': 'Estados Unidos' }
    }, 'Estados Unidos'), true, 'decollides - localization');

    t.end();
});

