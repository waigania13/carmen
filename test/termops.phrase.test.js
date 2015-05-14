var termops = require('../lib/util/termops');
var token = require('../lib/util/token');
var test = require('tape');

test('phrase - generates a name id', function(q) {
    q.deepEqual(termops.phrase(['foo'], 'foo'), 2851307223);
    q.deepEqual(termops.phrase(['foo','street'], 'foo'), 2851505742);
    q.deepEqual(termops.phrase(['foo','lane'], 'foo'), 2851502143);
    // Clusters phrase IDs based on initial term.
    q.deepEqual(termops.phrase(['foo'], 'foo') >>> 24, 169);
    q.deepEqual(termops.phrase(['foo','street'], 'foo') >>> 24, 169);
    q.deepEqual(termops.phrase(['foo','lane'], 'foo') >>> 24, 169);
    q.end();
});

