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

var from = new S3({data:{
    "_geocoder": "http://mapbox-carmen.s3.amazonaws.com/dev/01-ne.country",
    "maxzoom": 8
}}, function() {});

it('getFeature', function(done) {
    from.getFeature(16, function(err, doc) {
        assert.ifError(err);
        assert.deepEqual(doc, expected);
        done();
    });
});

it.skip('putFeature', function(done) {
    to.startWriting(function(err) {
        assert.ifError(err);
        to.putFeature(16, expected, function(err) {
            assert.ifError(err);
            to.stopWriting(function(err) {
                assert.ifError(err);
                to.getFeature(16, function(err, doc) {
                    assert.ifError(err);
                    assert.deepEqual(doc, expected);
                    done();
                });
            });
        });
    });
});

it('getCarmen', function(done) {
    from.getCarmen('term', 0, function(err, buffer) {
        assert.ifError(err);
        assert.equal(4098, buffer.length);
        done();
    });
});

it.skip('putCarmen', function(done) {
    to.startWriting(function(err) {
        assert.ifError(err);
        to.putCarmen('term', 0, new Buffer('asdf'), function(err) {
            assert.ifError(err);
            to.stopWriting(function(err) {
                assert.ifError(err);
                to.getCarmen('term', 0, function(err, buffer) {
                    assert.ifError(err);
                    assert.deepEqual('asdf', buffer.toString());
                    done();
                });
            });
        });
    });
});

it('getIndexableDocs', function(done) {
    from.getIndexableDocs({ limit: 10 }, function(err, docs, pointer) {
        assert.ifError(err);
        assert.equal(docs.length, 10);
        assert.deepEqual(pointer, {limit:10, done:false, marker:'dev/01-ne.country/data/107.json' });
        from.getIndexableDocs(pointer, function(err, docs, pointer) {
            assert.ifError(err);
            assert.equal(docs.length, 10);
            assert.deepEqual(pointer, { limit: 10, done:false, marker:'dev/01-ne.country/data/116.json' });
            done();
        });
    });
});

});

