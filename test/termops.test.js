var termops = require('../lib/util/termops');
var token = require('../lib/util/token');
var test = require('tape');

test('termops', function(t) {
    t.test('tokenize', function(q) {
        q.test('tokenizes basic strings', function(r) {
            r.deepEqual(termops.tokenize('foo'), ['foo']);
            r.deepEqual(termops.tokenize('foo bar'), ['foo', 'bar']);
            r.deepEqual(termops.tokenize('foo-bar'), ['foo', 'bar']);
            r.deepEqual(termops.tokenize('69-150'), ['69-150']);
            r.deepEqual(termops.tokenize('4-10'), ['4-10']);
            r.deepEqual(termops.tokenize('5-02A'), ['5-02a']);
            r.deepEqual(termops.tokenize('23-'), ['23']);
            r.deepEqual(termops.tokenize('San José'), ['san', 'jose']);
            r.deepEqual(termops.tokenize('San José'), ['san', 'jose']);
            r.deepEqual(termops.tokenize('Chamonix-Mont-Blanc'), ['chamonix','mont','blanc']);
            r.deepEqual(termops.tokenize('Москва'), ['moskva']);
            r.deepEqual(termops.tokenize('京都市'), ['jing','du','shi']);
            r.end();
        });
        q.test('tokenizes lonlat', function(r) {
            r.deepEqual(termops.tokenize('40,0', true), [40,0]);
            r.deepEqual(termops.tokenize('40.00000,-40.31200', true), [40,-40.312]);
            r.deepEqual(termops.tokenize('-120.9129102983109, 45.312312', true), [-120.9129102983109,45.312312]);
            r.deepEqual(termops.tokenize('14th 15th', true), ['14th','15th']);
            r.end();
        });
        q.test('edge cases - empty string', function(r) {
            r.deepEqual(termops.tokenize(''), []);
            r.end()
        });
        q.end();
    });
    t.test('id - tests if searching by id', function(q) {
        var indexes = {
            country: {},
            province: {},
            place: {},
            postcode: {},
            'multi.part': {}
        };
        q.deepEqual(termops.id(indexes, 'country.5432'), {dbname:'country', id:'5432'});
        q.deepEqual(termops.id(indexes, 'province.123'), {dbname:'province', id:'123'});
        q.deepEqual(termops.id(indexes, 'postcode.546'), {dbname:'postcode', id:'546'});
        q.deepEqual(termops.id(indexes, 'place.455233'), {dbname:'place', id:'455233'});
        q.deepEqual(termops.id(indexes, 'multi.part.455233'), {dbname:'multi.part', id:'455233'});
        q.strictEqual(termops.id(indexes, 'near country.5432'), false);
        q.strictEqual(termops.id(indexes, 'country.5432 street'), false);
        q.strictEqual(termops.id(indexes, '123.451,8.123'), false);
        q.strictEqual(termops.id(indexes, 'gotham.43213'), false);
        q.strictEqual(termops.id(indexes, 'country.a445'), false);
        q.strictEqual(termops.id(indexes, 'place.32f424'), false);
        q.strictEqual(termops.id(indexes, 'country.424k'), false);
        q.end();
    });
    t.test('terms - tokenizes and hashes values', function(q) {
        q.deepEqual(termops.terms(['foo','bar']), [2851307216,1991736592]);
        q.end();
    });
    t.test('termsMap - tokenizes and hashes values', function(q) {
        q.deepEqual(termops.termsMap(['foo','bar']), {
            2851307216: 'foo',
            1991736592: 'bar'
        });
        q.end();
    });
    t.test('degens', function(q) {
        var degens = termops.degens('foobarbaz');
        q.deepEqual(degens, [
            1617781328, 1617781328,
            4112850176, 1617781329,
            2921073328, 1617781330,
            3214735712, 1617781331,
            967483776, 1617781332,
            1062237920, 1617781333,
            2851307216, 1617781334
        ]);
        for (var i = 0; i < degens.length/2; i = i + 2) {
            // Encodes ID for 'foobarbaz'.
            q.equal(degens[i+1] >>> 4 << 4 >>> 0, termops.terms(['foobarbaz'])[0]);
            // Encodes degen distance (max: 15) from foobarbaz.
            q.ok(degens[i+1] % 16 <= 15);
        }
        q.end();
    });
    t.test('phrase - generates a name id', function(q) {
        q.deepEqual(termops.phrase(['foo'], 'foo'), 2851307223);
        q.deepEqual(termops.phrase(['foo','street'], 'foo'), 2851505742);
        q.deepEqual(termops.phrase(['foo','lane'], 'foo'), 2851502143);
        // Clusters phrase IDs based on initial term.
        q.deepEqual(termops.phrase(['foo'], 'foo') >>> 24, 169);
        q.deepEqual(termops.phrase(['foo','street'], 'foo') >>> 24, 169);
        q.deepEqual(termops.phrase(['foo','lane'], 'foo') >>> 24, 169);
        q.end();
    });

    t.end();
});

test('termops.getIndexableText', function(assert) {
    var freq = { 0:[2] };
    assert.deepEqual(termops.getIndexableText(token.createReplacer({}), 'Main Street'), [
        [ 'main', 'street' ]
    ], 'creates indexableText');
    assert.deepEqual(termops.getIndexableText(token.createReplacer({'Street':'St'}), 'Main Street'), [
        [ 'main', 'street' ],
        [ 'main', 'st' ]
    ], 'creates contracted phrases using geocoder_tokens');
    assert.deepEqual(termops.getIndexableText(token.createReplacer({'Street':'St'}), 'Main Street, main st'), [
        [ 'main', 'street' ],
        [ 'main', 'st' ]
    ], 'dedupes phrases');
    assert.deepEqual(termops.getIndexableText(token.createReplacer({'Street':'St', 'Lane':'Ln'}), 'Main Street Lane'), [
        [ 'main', 'street', 'lane' ],
        [ 'main', 'st', 'ln' ]
    ], 'dedupes phrases');
    assert.deepEqual(termops.getIndexableText(token.createReplacer({'dix-huitième':'18e'}), 'Avenue du dix-huitième régiment'), [
        [ 'avenue', 'du', 'dix', 'huitieme', 'regiment' ],
        [ 'avenue', 'du', '18e', 'regiment' ]
    ], 'hypenated replacement');
    assert.end();
});
