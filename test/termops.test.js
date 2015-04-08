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
            r.end();
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
            2851307216, 1617781334,
            1646454848, 1617781335
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

    t.test('maskAddress', function(q) {
        q.deepEqual(termops.maskAddress(['1', 'fake', 'street', '100'], parseInt('1110',2)), {addr: '100', pos: 3});
        q.deepEqual(termops.maskAddress(['100', '1', 'fake', 'street'], parseInt('1111',2)), {addr: '100', pos: 0});
        q.deepEqual(termops.maskAddress(['1', 'fake', 'street', '100b'], parseInt('1110',2)), {addr: '100b', pos: 3});
        q.deepEqual(termops.maskAddress(['100b', '1', 'fake', 'street'], parseInt('1111',2)), {addr: '100b', pos: 0});
        q.deepEqual(termops.maskAddress(['1', 'fake', 'street', '100', '200'], parseInt('1110',2)), {addr: '100', pos: 3});
        q.end();
    });

    t.end();
});

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
        [ 'avenue', 'du', '18e', 'regiment' ]
    ], 'hypenated replacement');

    replacer = token.createReplacer({});
    doc = {_text:'Main Street', _cluster:{1:{}, 10:{}}};
    assert.deepEqual(termops.getIndexableText(replacer, doc), [
        ['{"type":"range","min":1,"max":10}', 'main', 'street' ],
        ['main', 'street', '{"type":"range","min":1,"max":10}' ]
    ], 'with range');


    assert.end();
});
