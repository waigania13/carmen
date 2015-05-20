var verifymatch = require('../lib/verifymatch');
var tape = require('tape');

tape('verifymatch.sortFeature', function(assert) {
    var arr = [
        { _id: 5, _relev:0.9 },
        { _id: 4, _relev:1.0 },
        { _id: 3, _relev:1.0, _address:'26', _geometry: { omitted: true } },
        { _id: 2, _relev:1.0, _address:'26', _geometry: {}, _score: 1 },
        { _id: 1, _relev:1.0, _address:'26', _geometry: {}, _score: 2 }
    ];
    arr.sort(verifymatch.sortFeature);
    assert.deepEqual(arr.map(function(f) { return f._id }), [1,2,3,4,5]);

    var feats = require('/tmp/foo.json');
    console.log(feats.map(function(f) { return JSON.stringify({ _id:f._id, _relev:f._relev,_address:f._address,_geometry:{omitted:f._geometry.omitted}, _score:f._score });}));
    feats.sort(verifymatch.sortFeature);
    console.log(feats.map(function(f) { return JSON.stringify({ _id:f._id, _relev:f._relev,_address:f._address,_geometry:{omitted:f._geometry.omitted}, _score:f._score });}));
    assert.end();
});
