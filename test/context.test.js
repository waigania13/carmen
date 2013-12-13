var _ = require('underscore');
var fs = require('fs');
var assert = require('assert');
var util = require('util');
var Carmen = require('..');
var tilelive = require('tilelive');
var context = require('../lib/context');

describe('context vector', function() {
    var geocoder = new Carmen({
        country: Carmen.auto(__dirname + '/fixtures/01-ne.country.s3')
    });
    before(function(done) {
        geocoder._open(done);
    });
    it ('context vt full', function(done) {
        context(geocoder, 0, 40, null, true, function(err, contexts) {
            assert.ifError(err);
            assert.equal(1, contexts.length);
            assert.deepEqual(contexts[0], {
                _center: [ -3.47835978729807, 39.9091671758124 ],
                _id: 33,
                _text: 'Spain',
                iso2: 'ES',
                name: 'Spain',
                population: 40525002,
                _zxy: [
                    '6/28/26',
                    '6/29/26',
                    '6/30/23',
                    '6/30/24',
                    '6/30/25',
                    '6/31/23',
                    '6/31/24',
                    '6/31/25',
                    '6/32/23',
                    '6/32/24',
                    '6/32/25'
                ],
                _bbox: [
                    -18.16661250838556,
                    27.641983134451202,
                    4.351909627135207,
                    43.80518259730744
                ],
                _extid: 'country.33'
            });
            done();
        });
    });
    it ('context vt light', function(done) {
        context(geocoder, 0, 40, null, false, function(err, contexts) {
            assert.ifError(err);
            assert.equal(1, contexts.length);
            assert.deepEqual(contexts[0], {
                _text: 'Spain',
                _extid: 'country.33'
            });
            done();
        });
    });
});

describe('context utf', function() {
    var geocoder = new Carmen({
        country: Carmen.auto(__dirname + '/fixtures/01-ne.country.utf.s3')
    });
    before(function(done) {
        geocoder._open(done);
    });
    it ('context utf full', function(done) {
        context(geocoder, 0, 40, null, true, function(err, contexts) {
            assert.ifError(err);
            assert.equal(1, contexts.length);
            assert.deepEqual(contexts[0], {
                bounds: '-18.1666125083856,27.6419831344512,4.35190962713521,43.8051825973075',
                lat: 39.9091671758124,
                lon: -3.47835978729807,
                name: 'Spain',
                population: 40525002,
                search: 'Spain',
                _id: '24',
                _text: 'Spain',
                _zxy: [
                    '8/115/107',
                    '8/115/106',
                    '8/116/107',
                    '8/116/106',
                    '8/117/107',
                    '8/117/106',
                    '8/118/107',
                    '8/118/106',
                    '8/121/95',
                    '8/121/94',
                    '8/121/93',
                    '8/122/99',
                    '8/122/98',
                    '8/122/97',
                    '8/122/95',
                    '8/122/94',
                    '8/122/93',
                    '8/123/100',
                    '8/123/99',
                    '8/123/98',
                    '8/123/97',
                    '8/123/96',
                    '8/123/95',
                    '8/123/94',
                    '8/123/93',
                    '8/124/100',
                    '8/124/99',
                    '8/124/98',
                    '8/124/97',
                    '8/124/96',
                    '8/124/95',
                    '8/124/94',
                    '8/124/93',
                    '8/125/101',
                    '8/125/99',
                    '8/125/98',
                    '8/125/97',
                    '8/125/96',
                    '8/125/95',
                    '8/125/94',
                    '8/125/93',
                    '8/126/99',
                    '8/126/98',
                    '8/126/97',
                    '8/126/96',
                    '8/126/95',
                    '8/126/94',
                    '8/126/93',
                    '8/127/99',
                    '8/127/98',
                    '8/127/97',
                    '8/127/96',
                    '8/127/95',
                    '8/127/94',
                    '8/127/93',
                    '8/128/98',
                    '8/128/97',
                    '8/128/96',
                    '8/128/95',
                    '8/128/94',
                    '8/129/98',
                    '8/129/97',
                    '8/129/95',
                    '8/129/94',
                    '8/130/97',
                    '8/130/96',
                    '8/130/95',
                    '8/130/94',
                    '8/131/97',
                    '8/131/96'
                ],
                _extid: 'country.24'
            });
            done();
        });
    });
    it ('context utf light', function(done) {
        context(geocoder, 0, 40, null, false, function(err, contexts) {
            assert.ifError(err);
            assert.equal(1, contexts.length);
            assert.deepEqual(contexts[0], {
                _text: 'Spain',
                _extid: 'country.24'
            });
            done();
        });
    });
});

