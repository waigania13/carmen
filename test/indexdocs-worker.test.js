var worker = require('../lib/indexer/indexdocs-worker.js');
var tape = require('tape');
var termops = require('../lib/util/termops.js');

tape('worker.getIndexableText', function(assert) {
    var freq = { 0:[2] };
    assert.deepEqual(worker.getIndexableText('Main Street', freq, {}), {
        termsets: [
            [ 3935363599, 1986331711 ]
        ],
        termsmaps: [
            { '1986331696': 'street', '3935363584': 'main' }
        ],
        tokensets: [
            [ 'main', 'street' ]
        ]
    }, 'creates indexableText');
    assert.deepEqual(worker.getIndexableText('Main Street', freq, termops.tokenizeMapping({'street':'st'})), {
        termsets: [
            [ 3935363599, 1986331711 ],
            [ 3935363599, 1263673935 ]
        ],
        termsmaps: [
            { '1986331696': 'street', '3935363584': 'main' },
            { 1263673920: 'st', 3935363584: 'main' }
        ],
        tokensets: [
            [ 'main', 'street' ],
            [ 'main', 'st' ]
        ]
    }, 'creates contracted phrases using geocoder_tokens');
    assert.deepEqual(worker.getIndexableText('Main Street, main st', freq, termops.tokenizeMapping({'street':'st'})), {
        termsets: [
            [ 3935363599, 1986331711 ],
            [ 3935363599, 1263673935 ]
        ],
        termsmaps: [
            { '1986331696': 'street', '3935363584': 'main' },
            { 1263673920: 'st', 3935363584: 'main' }
        ],
        tokensets: [
            [ 'main', 'street' ],
            [ 'main', 'st' ]
        ]
    }, 'dedupes phrases');
    assert.deepEqual(worker.getIndexableText('Main Street Lane', freq, termops.tokenizeMapping({'street':'st', 'lane':'ln'})), {
        termsets: [
            [ 3935363599, 1986331711, 1860843567 ],
            [ 3935363599, 1263673935, 1127334399 ]
        ],
        termsmaps: [
            { 1860843552: 'lane', 1986331696: 'street', 3935363584: 'main' },
            { 1127334384: 'ln', 1263673920: 'st', 3935363584: 'main' }
        ],
        tokensets: [
            [ 'main', 'street', 'lane' ],
            [ 'main', 'st', 'ln' ]
        ]
    }, 'dedupes phrases');
    assert.deepEqual(worker.getIndexableText('Avenue du dix-huitième régiment', freq, termops.tokenizeMapping({'dix-huitième':'18e'})), {
            termsets: [
                [
                    214095199,
                    1276949887,
                    3814893615,
                    2955928287,
                    4111263999
                ],
                [
                    214095199,
                    1276949887,
                    606069615,
                    4111263999
                ]
            ],
            termsmaps: [
                {
                    1276949872: 'du',
                    214095184: 'avenue',
                    2955928272: 'huitieme',
                    3814893600: 'dix',
                    4111263984: 'regiment'
                },
                {
                    1276949872: 'du',
                    214095184: 'avenue',
                    4111263984: 'regiment',
                    606069600: '18e'
                }
            ],
            tokensets: [
                [
                    'avenue',
                    'du',
                    'dix',
                    'huitieme',
                    'regiment'
                ],
                [
                    'avenue',
                    'du',
                    '18e',
                    'regiment'
                ]
            ]
        }, 'dedupes phrases');
    assert.end();
});

tape('worker.verifyCenter', function(assert) {
    assert.equal(worker.verifyCenter([0,0], [[0,0,0]]), true, 'center in tiles');
    assert.equal(worker.verifyCenter([0,-45], [[0,0,1],[1,0,1]]), false, 'center outside tiles');
    assert.end();
});

tape('worker.runChecks', function(assert) {
    assert.equal(worker.runChecks({
    }), 'doc has no _id');
    assert.equal(worker.runChecks({
        _id:1
    }), 'doc has no _text on _id:1');
    assert.equal(worker.runChecks({
        _id:1,
        _text:'Main Street'
    }), 'doc has no _center or _geometry on _id:1');
    assert.equal(worker.runChecks({
        _id:1,
        _text:'Main Street',
        _center:[0,0]
    }), 'index has no zoom on _id:1');
    assert.equal(worker.runChecks({
        _id:1,
        _text:'Main Street',
        _center:[0,0]
    }, -1), 'zoom must be greater than 0 --- zoom was -1 on _id:1');
    assert.equal(worker.runChecks({
        _id:1,
        _text:'Main Street',
        _center:[0,0]
    }, 15), 'zoom must be less than 15 --- zoom was 15 on _id:1');
    assert.equal(worker.runChecks({
        _id:1,
        _text:'Main Street',
        _center:[0,0],
        _geometry: { type: 'Polygon', coordinates: [new Array(60e3)] }
    }, 12), 'Polygons may not have more than 50k vertices. Simplify your polygons, or split the polygon into multiple parts.');
    assert.equal(worker.runChecks({
        _id:1,
        _text:'Main Street',
        _center:[0,0],
        _geometry: { type: 'MultiPolygon', coordinates: [[new Array(30e3)],[new Array(30e3)]] }
    }, 12), 'Polygons may not have more than 50k vertices. Simplify your polygons, or split the polygon into multiple parts.');
    assert.equal(worker.runChecks({
        _id:1,
        _text:'Main Street',
        _center:[0,0],
        _geometry: { type: 'Point', coordinates: [0,0] }
    }, 12), '');
    assert.end();
});

