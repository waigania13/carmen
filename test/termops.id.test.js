var termops = require('../lib/util/termops');
var test = require('tape');

test('id - tests if searching by id', function(q) {
    var geocoder = {
        bytype: {
            country: {},
            province: {},
            place: {},
            postcode: {},
            'multi.part': {}
        }
    };

    var shardGeocoder = { shard: true };
    q.deepEqual(termops.id(geocoder, 'country.5432'), {dbname:'country', id:'5432'});
    q.deepEqual(termops.id(geocoder, 'province.123'), {dbname:'province', id:'123'});
    q.deepEqual(termops.id(geocoder, 'postcode.546'), {dbname:'postcode', id:'546'});
    q.deepEqual(termops.id(geocoder, 'place.455233'), {dbname:'place', id:'455233'});
    q.deepEqual(termops.id(geocoder, 'multi.part.455233'), {dbname:'multi.part', id:'455233'});
    q.strictEqual(termops.id(geocoder, 'near country.5432'), false);
    q.strictEqual(termops.id(geocoder, 'country.5432 street'), false);
    q.strictEqual(termops.id(geocoder, '123.451,8.123'), false);
    q.strictEqual(termops.id(geocoder, 'gotham.43213'), false);
    q.strictEqual(termops.id(geocoder, 'country.a445'), false);
    q.strictEqual(termops.id(geocoder, 'place.32f424'), false);
    q.strictEqual(termops.id(geocoder, 'country.424k'), false);
    q.strictEqual(termops.id(shardGeocoder, 'country.5432'), false);
    q.end();
});

