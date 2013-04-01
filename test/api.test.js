var _ = require('underscore');
var fs = require('fs');
var assert = require('assert');
var util = require('util');
var Carmen = require('..');
var MBTiles = Carmen.MBTiles();
var S3 = Carmen.S3();

var backends = {
    mbtiles: new MBTiles(__dirname + '/../tiles/ne-provinces.mbtiles', function(){}),
    s3: new S3(__dirname + '/../tiles/ne-provinces.s3', function(){})
};

_(backends).each(function(backend, name) { describe('api ' + name, function() {

it('search query', function(done) {
    backend.search('York', null, function(err, docs) {
        assert.ifError(err);
        docs.sort(function(a,b) { return a.id <= b.id ? -1 : 1 });
        assert.equal(docs.length, 6);
        assert.equal(_(docs).pluck('id').join(','), '1554,2639,2658,3045,515,823');
        assert.equal(_(docs).pluck('zxy').map(function(z) { return z.length }).join(','), '1,6,9,6,66,4');
        docs.forEach(function(d) { assert.ok(/york/i.test(d.text)) });
        done();
    });
});

it('search utf8', function(done) {
    backend.search('Laško', null, function(err, docs) {
        assert.ifError(err);
        docs.sort(function(a,b) { return a.id <= b.id ? -1 : 1 });
        assert.equal(docs.length, 1);
        assert.equal(_(docs).pluck('id').join(','), '1721');
        assert.equal(_(docs).pluck('zxy').map(function(z) { return z.length }).join(','), '2');
        done();
    });
});

it('search hyphenated', function(done) {
    backend.search('Kangwon-do', null, function(err, docs) {
        assert.ifError(err);
        docs.sort(function(a,b) { return a.id <= b.id ? -1 : 1 });
        assert.equal(docs.length, 1);
        assert.equal(_(docs).pluck('id').join(','), '3395');
        assert.equal(_(docs).pluck('zxy').map(function(z) { return z.length }).join(','), '9');
        done();
    });
});

it('search id', function(done) {
    backend.search(null, '993', function(err, docs) {
        assert.ifError(err);
        docs.sort(function(a,b) { return a.id <= b.id ? -1 : 1 });
        assert.equal(docs.length, 1);
        assert.equal(docs[0].id, '993');
        assert.ok(/montana/i.test(docs[0].text));
        assert.equal(docs[0].zxy.length, 178);
        done();
    });
});

it('feature', function(done) {
    backend.feature(993, function(err, doc) {
        assert.ifError(err);
        assert.deepEqual(doc, {
            bounds: '-116.048944134764,44.3766154157689,-104.03859257169,48.9929728380261',
            lat: 46.6847941268975,
            lon: -109.342969447946,
            name: 'Montana',
            score: 379530333098.087,
            search: 'Montana,MT'
        });
        done();
    });
});

if (name === 'mbtiles') it('indexable', function(done) {
    backend.indexable({ limit: 10 }, function(err, docs, pointer) {
        assert.ifError(err);
        assert.equal(docs.length, 10);
        assert.deepEqual(pointer, {
            limit: 10,
            offset: 10
        });
        backend.indexable(pointer, function(err, docs, pointer) {
            assert.ifError(err);
            assert.equal(docs.length, 10);
            assert.deepEqual(pointer, {
                limit: 10,
                offset: 20
            });
            done();
        });
    });
});

if (name === 's3') it('indexable', function(done) {
    backend.indexable({ limit: 10 }, function(err, docs, pointer) {
        assert.ifError(err);
        assert.equal(docs.length, 10);
        assert.deepEqual(pointer, {
            limit: 10,
            done: false,
            marker: 'fixtures/ne-provinces/data/1006.json'
        });
        backend.indexable(pointer, function(err, docs, pointer) {
            assert.ifError(err);
            assert.equal(docs.length, 10);
            assert.deepEqual(pointer, {
                limit: 10,
                done: false,
                marker: 'fixtures/ne-provinces/data/1015.json'
            });
            done();
        });
    });
});

})});


