var termops = require('../lib/util/termops');
var test = require('tape');

test('termops', function(t) {
    t.test('tokenize', function(q) {
        q.test('tokenizes basic strings', function(r) {
            r.deepEqual(termops.tokenize('foo'), ['foo']);
            r.deepEqual(termops.tokenize('foo bar'), ['foo', 'bar']);
            r.deepEqual(termops.tokenize('foo-bar'), ['foo', 'bar']);
            r.deepEqual(termops.tokenize('69-150'), ['69-150']);
            r.deepEqual(termops.tokenize('4-10'), ['4-10']);
            r.deepEqual(termops.tokenize('5-02a'), ['5-02a']);
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
    t.test('isIdent - tests if searching by id', function(q) {
        var index = {
            country: "",
            province: "",
            place: "",
            postcode: ""
        };
        q.strictEqual(termops.isIdent(index, 'country.5432'), true);
        q.strictEqual(termops.isIdent(index, 'province.123'), true);
        q.strictEqual(termops.isIdent(index, 'postcode.546'), true);
        q.strictEqual(termops.isIdent(index, 'place.455233'), true);
        q.strictEqual(termops.isIdent(index, 'gotham.43213'), false);
        q.strictEqual(termops.isIdent(index, 'country.a445'), false);
        q.strictEqual(termops.isIdent(index, 'place.32f424'), false);
        q.strictEqual(termops.isIdent(index, 'country.424k'), false);
        q.end();
    });
    t.test('tokenMap - maps query tokens', function(q) {
        q.deepEqual([
            'nw',
            'broad',
            'st'
        ], termops.tokenMap({
            'street': 'st',
            'northwest': 'nw'
        }, [
            'northwest',
            'broad',
            'street'
        ]));
        q.end();
    });
    t.test('tokenizeMapping', function(q) {
        q.deepEqual({}, termops.tokenizeMapping({}));
        q.deepEqual({
            'street': 'st'
        }, termops.tokenizeMapping({
            'Street': 'St'
        }));
        q.throws(function() {
            q.deepEqual({
                'north west': 'nw'
            }, termops.tokenizeMapping({
                'North West': 'NW'
            }));
        }, /Invalid mapping token North West/);
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
    
    t.test('address', function(q) {
        q.deepEqual(termops.address('500 baker st'), '500', 'full address');
        q.deepEqual(termops.address('baker st'), null, 'no housenum');
        q.deepEqual(termops.address('500'), null, 'only number');
        q.deepEqual(termops.address('500b baker st'), '500b', 'alphanumeric');
        q.deepEqual(termops.address('15th st'), null, 'numbered st');
        q.deepEqual(termops.address('15 st francis drive'), '15', 'ambiguous abbr');
        q.end();
    }); 

    t.end();
});
