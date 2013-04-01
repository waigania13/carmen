var _ = require('underscore');
var fs = require('fs');
var assert = require('assert');
var util = require('util');
var Carmen = require('..');
var MBTiles = Carmen.MBTiles();
var S3 = Carmen.S3();

var backends = {
    mbtiles: new MBTiles(__dirname + '/../tiles/ne-countries.mbtiles', function(){}),
    s3: new S3(__dirname + '/../tiles/ne-countries.s3', function(){})
};

_(backends).each(function(backend, name) { describe('api ' + name, function() {

it('search query', function(done) {
    backend.search('new', null, function(err, docs) {
        assert.ifError(err);
        docs.sort(function(a,b) { return a.id <= b.id ? -1 : 1 });
        assert.equal(docs.length, 3);
        assert.equal(docs[0].id, '146');
        assert.equal(docs[1].id, '60');
        assert.equal(docs[2].id, '93');
        assert.ok(/new zealand/i.test(docs[0].text));
        assert.ok(/new caledonia/i.test(docs[1].text));
        assert.ok(/new/i.test(docs[2].text));
        assert.equal(docs[0].zxy.length, 60);
        assert.equal(docs[1].zxy.length, 11);
        assert.equal(docs[2].zxy.length, 57);
        done();
    });
});

it('search id', function(done) {
    backend.search(null, '60', function(err, docs) {
        assert.ifError(err);
        docs.sort(function(a,b) { return a.id <= b.id ? -1 : 1 });
        assert.equal(docs.length, 1);
        assert.equal(docs[0].id, '60');
        assert.ok(/new caledonia/i.test(docs[0].text));
        assert.equal(docs[0].zxy.length, 11);
        done();
    });
});

it('feature', function(done) {
    backend.feature(146, function(err, doc) {
        assert.ifError(err);
        assert.deepEqual(doc, {
            bounds: '-177.956962444279,-52.5773064168166,178.844049520022,-8.54335337282838',
            lat: -43.5920925904423,
            lon: 171.229237082587,
            name: 'New Zealand',
            population: 4213418,
            search: 'New Zealand'
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
            marker: 'fixtures/ne-countries/data/107.json'
        });
        backend.indexable(pointer, function(err, docs, pointer) {
            assert.ifError(err);
            assert.equal(docs.length, 10);
            assert.deepEqual(pointer, {
                limit: 10,
                done: false,
                marker: 'fixtures/ne-countries/data/116.json'
            });
            done();
        });
    });
});

})});


