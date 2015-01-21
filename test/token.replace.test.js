var token = require('../lib/util/token');
var test = require('tape');

test('token replacement', function(t) {
    t.test('regex effectiveness', function(q) {
        q.deepEqual(
            'mlk jr st ne',
        token.token_replace({
            'Martin luther king jr': 'mlk jr',
            'Street': 'st',
            'Northeast': 'ne'
        },'martin luther king jr street northeast'));
        q.deepEqual(
            'sunset blvd, sf',
        token.token_replace({
            'Boulevard': 'blvd',
            'San Francisco': 'sf',
            'Northeast': 'ne'
        },'sunset boulevard, san francisco'));
        q.deepEqual(
            'ZI, 4e av nice',
        token.token_replace({
            'Quatrième': '4e',
            '4ème': '4e',
            'Avenue': 'av',
            'Zone Industrielle': 'ZI'
        },'zone industrielle, quatrième avenue nice'));
        q.end();
    })
});
