var verifymatch = require('../lib/verifymatch');
var tape = require('tape');

tape('verifymatch.sortFeature', function(assert) {
    var arr = [
        { _id: 7, _spatialmatch:{relev:0.9}, _address:null },
        { _id: 6, _spatialmatch:{relev:1.0}, _address:null },
        { _id: 5, _spatialmatch:{relev:1.0}, _address:'26', _geometry: { omitted: true } },
        { _id: 4, _spatialmatch:{relev:1.0}, _address:'26', _geometry: {}, _scoredist:2, },
        { _id: 3, _spatialmatch:{relev:1.0}, _address:'26', _geometry: {}, _scoredist:3, },
        { _id: 2, _spatialmatch:{relev:1.0}, _address:'26', _geometry: {}, _scoredist:4, _position:2 },
        { _id: 1, _spatialmatch:{relev:1.0}, _address:'26', _geometry: {}, _scoredist:5, _position:1 }
    ];
    arr.sort(verifymatch.sortFeature);
    assert.deepEqual(arr.map(function(f) { return f._id }), [1,2,3,4,5,6,7]);

    assert.end();
});

tape('verifymatch.sortContext (no distance)', function(assert) {
    var c;
    var arr = [];

    c = [{ _id: 10 }];
    c._relevance = 0.9;
    arr.push(c);

    c = [{ _id: 9, _address:'26' }];
    c._relevance = 1.0;
    arr.push(c);

    c = [{ _id: 8, _address:'26', _cluster:{}, _geometry: { omitted: true } }];
    c._relevance = 1.0;
    arr.push(c);

    c = [{ _id: 7, _address:'26', _cluster:{}, _geometry: {} }];
    c._relevance = 1.0;
    arr.push(c);

    c = [{ _id: 6, _address:'26', _cluster:{}, _geometry: {}, _scoredist:1 }];
    c._relevance = 1.0;
    arr.push(c);

    c = [{ _id: 5, _address:'26', _cluster:{}, _geometry: {}, _scoredist:2 }];
    c._relevance = 1.0;
    arr.push(c);

    c = [{ _id: 4, _address:'26', _cluster:{}, _geometry: {}, _scoredist:2 }];
    c._relevance = 1.0;
    c._typeindex = 2;
    arr.push(c);

    c = [{ _id: 3, _address:'26', _cluster:{}, _geometry: {}, _scoredist:2 }];
    c._relevance = 1.0;
    c._typeindex = 1;
    c._distance = 20;
    arr.push(c);

    c = [{ _id: 2, _address:'26', _cluster:{}, _geometry: {}, _scoredist:2 }];
    c._relevance = 1.0;
    c._typeindex = 1;
    c._distance = 10;
    arr.push(c);

    c = [{ _id: 1, _address:'26', _cluster:{}, _geometry: {}, _scoredist:2, _position: 2 }];
    c._relevance = 1.0;
    c._typeindex = 1;
    arr.push(c);

    c = [{ _id: 0, _address:'26', _cluster:{}, _geometry: {}, _scoredist:2, _position: 1 }];
    c._relevance = 1.0;
    c._typeindex = 1;
    arr.push(c);

    arr.sort(verifymatch.sortContext);
    assert.deepEqual(arr.map(function(c) { return c[0]._id }), [0,1,2,3,4,5,6,7,8,9,10]);

    assert.end();
});

tape('verifymatch.sortContext (with distance)', function(assert) {
    var c;
    var arr = [];

    c = [{ _id: 6 }];
    c._relevance = 0.9;
    arr.push(c);

    c = [{ _id: 5, _address:'26' }];
    c._relevance = 1.0;
    arr.push(c);

    c = [{ _id: 4, _address:'26', _cluster:{}, _geometry: { omitted: true } }];
    c._relevance = 1.0;
    arr.push(c);

    c = [{ _id: 3, _address:'26', _cluster:{}, _geometry: {} }];
    c._relevance = 1.0;
    c._typeindex = 2;
    arr.push(c);

    c = [{ _id: 2, _address:'26', _cluster:{}, _geometry: {}, _scoredist:1 }];
    c._relevance = 1.0;
    c._typeindex = 1;
    arr.push(c);

    c = [{ _id: 1, _address:'26', _cluster:{}, _geometry: {}, _scoredist:2 }];
    c._relevance = 1.0;
    c._typeindex = 1;
    arr.push(c);

    arr.sort(verifymatch.sortContext);
    assert.deepEqual(arr.map(function(c) { return c[0]._id }), [1,2,3,4,5,6]);

    assert.end();
});

tape('verifymatch.sortContext (distance vs addresstype)', function(assert) {
    var c;
    var arr = [];

    c = [{ _id: 3 }];
    c._relevance = 0.9;
    arr.push(c);

    c = [{ _id: 2, _address:'26', _scoredist: 1, _cluster:{} }];
    c._relevance = 1.0;
    arr.push(c);

    c = [{ _id: 1, _address:'26', _scoredist: 2 }];
    c._relevance = 1.0;
    arr.push(c);


    arr.sort(verifymatch.sortContext);
    assert.deepEqual(arr.map(function(c) { return c[0]._id }), [1,2,3]);

    assert.end();
});

