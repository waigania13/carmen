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
    it ('context', function(done) {
        context(geocoder, 0, 40, null, function(err, contexts) {
            assert.ifError(err);
            assert.equal(1, contexts.length);
            assert.deepEqual(contexts[0], {
                bounds: [
                    -18.1666125083856,
                    27.6419831344512,
                    4.35190962713521,
                    43.8051825973074
                ],
                iso2: 'ES',
                lat: 39.90916717581237,
                lon: -3.4783597872980687,
                name: 'Spain',
                population: 40525002,
                id: 'country.33',
                type: 'country'
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
    it ('context', function(done) {
        context(geocoder, 0, 40, null, function(err, contexts) {
            assert.ifError(err);
            assert.equal(1, contexts.length);
            assert.deepEqual(contexts[0], {
                bounds: [
                    -18.1666125083856,
                    27.6419831344512,
                    4.35190962713521,
                    43.8051825973075
                ],
                lat: 39.9091671758124,
                lon: -3.47835978729807,
                name: 'Spain',
                population: 40525002,
                id: 'country.24',
                type: 'country'
            });
            done();
        });
    });
});

