var _ = require('underscore');
var fs = require('fs');
var assert = require('assert');
var util = require('util');
var Carmen = require('..');
var S3 = Carmen.S3();

describe('api s3', function() {

var expected = {
    bounds: '-141.005548666451,41.6690855919108,-52.615930948992,83.1161164353916',
    lat: 56.8354595949484,
    lon: -110.424643384994,
    name: 'Canada',
    population: 33487208,
    search: 'Canada, CA'
};

var from = new S3({data:JSON.parse(fs.readFileSync(__dirname + '/fixtures/01-ne.country.s3'))}, function() {});
var prefixed = new S3({data:JSON.parse(fs.readFileSync(__dirname + '/fixtures/01-ne.country.prefixed.s3'))}, function() {});

it('getGeocoderData', function(done) {
    from.getGeocoderData('term', 0, function(err, buffer) {
        assert.ifError(err);
        assert.equal(3891, buffer.length);
        done();
    });
});

it('getGeocoderData (prefixed source)', function(done) {
    prefixed.getGeocoderData('term', 0, function(err, buffer) {
        assert.ifError(err);
        assert.equal(3891, buffer.length);
        done();
    });
});

it.skip('putGeocoderData', function(done) {
    to.startWriting(function(err) {
        assert.ifError(err);
        to.putGeocoderData('term', 0, new Buffer('asdf'), function(err) {
            assert.ifError(err);
            to.stopWriting(function(err) {
                assert.ifError(err);
                to.getGeocoderData('term', 0, function(err, buffer) {
                    assert.ifError(err);
                    assert.deepEqual('asdf', buffer.toString());
                    done();
                });
            });
        });
    });
});

it('getIndexableDocs', function(done) {
    from.getIndexableDocs({}, function(err, docs, pointer) {
        assert.ifError(err);
        assert.equal(docs.length, 63);
        assert.deepEqual(pointer, {shard:1});
        from.getIndexableDocs(pointer, function(err, docs, pointer) {
            assert.ifError(err);
            assert.equal(docs.length, 64);
            assert.deepEqual(pointer, {shard:2});
            done();
        });
    });
});

it('getIndexableDocs (prefixed source)', function(done) {
    prefixed.getIndexableDocs({}, function(err, docs, pointer) {
        assert.ifError(err);
        assert.equal(docs.length, 63);
        assert.deepEqual(pointer, {shard:1});
        prefixed.getIndexableDocs(pointer, function(err, docs, pointer) {
            assert.ifError(err);
            assert.equal(64, docs.length);
            assert.equal('64', docs[0]._id);
            assert.deepEqual(pointer, {shard:2});
            prefixed.getIndexableDocs(pointer, function(err, docs, pointer) {
                assert.ifError(err);
                assert.equal(64, docs.length);
                assert.equal('128', docs[0]._id);
                assert.deepEqual(pointer, {shard:3});
                done();
            });
        });
    });
});

});

