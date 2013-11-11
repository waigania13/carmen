var _ = require('underscore');
var fs = require('fs');
var assert = require('assert');
var util = require('util');
var Carmen = require('..');
var MBTiles = Carmen.MBTiles();

describe('api mbtiles', function() {

var expected = {
    bounds: '-141.005548666451,41.6690855919108,-52.615930948992,83.1161164353916',
    lat: 56.8354595949484,
    lon: -110.424643384994,
    name: 'Canada',
    population: 33487208,
    search: 'Canada, CA'
};

var tmp = '/tmp/carmen-test-' + (+new Date).toString(16);
var from;
var to;

before(function(done) {
    try { fs.mkdirSync(tmp); } catch(err) { throw err; }
    from = new MBTiles(__dirname + '/../tiles/01-ne.country.mbtiles', function(){});
    to = new MBTiles(tmp + '/01-ne.country.mbtiles', function(){});
    done();
});

after(function(done) {
    from.close(function(err) {
        if (err) throw err;
        to.close(function(err) {
            if (err) throw err;
            try { fs.unlinkSync(tmp + '/01-ne.country.mbtiles'); } catch(err) { throw err; }
            try { fs.rmdirSync(tmp); } catch(err) { throw err; }
            done();
        });
    });
});

it('getFeature', function(done) {
    from.getFeature(16, function(err, doc) {
        assert.ifError(err);
        assert.deepEqual(doc, expected);
        done();
    });
});

it('putFeature', function(done) {
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

it('getGeocoderData', function(done) {
    from.getGeocoderData('term', 0, function(err, buffer) {
        assert.ifError(err);
        assert.equal(4137, buffer.length);
        done();
    });
});

it('putGeocoderData', function(done) {
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
    from.getIndexableDocs({ limit: 10 }, function(err, docs, pointer) {
        assert.ifError(err);
        assert.equal(docs.length, 10);
        assert.deepEqual(pointer, { limit: 10, offset: 10, nogrids: false });
        from.getIndexableDocs(pointer, function(err, docs, pointer) {
            assert.ifError(err);
            assert.equal(docs.length, 10);
            assert.deepEqual(pointer, { limit: 10, offset: 20, nogrids: false });
            done();
        });
    });
});

});

