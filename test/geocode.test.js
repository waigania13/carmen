var fs = require('fs');
var util = require('util');
var Carmen = require('..');
var UPDATE = process.env.UPDATE;
var test = require('tape');

test('geocode', function(t) {
    var geocoder = new Carmen({
        country: Carmen.auto(__dirname + '/fixtures/01-ne.country.s3'),
        province: Carmen.auto(__dirname + '/fixtures/02-ne.province.s3')
    });

    t.test ('phrasematch 0.5 relev', function(q) {
        geocoder.geocode('czech', {}, function(err, res) {
            q.ifError(err);
            if (UPDATE) fs.writeFileSync(__dirname + '/fixtures/geocode-phraserelev.json', JSON.stringify(res, null, 4));
            q.deepEqual(res, require(__dirname + '/fixtures/geocode-phraserelev.json'));
            q.end();
        });
    });

    t.test ('forward', function(q) {
        geocoder.geocode('georgia', {}, function(err, res) {
            q.ifError(err);
            if (UPDATE) fs.writeFileSync(__dirname + '/fixtures/geocode-forward.json', JSON.stringify(res, null, 4));
            q.deepEqual(res, require(__dirname + '/fixtures/geocode-forward.json'));
            q.end();
        });
    });
    t.test ('forward + by id', function(q) {
        geocoder.geocode('country.38', {}, function(err, res) {
            q.ifError(err);
            if (UPDATE) fs.writeFileSync(__dirname + '/fixtures/search-ident.json', JSON.stringify(res, null, 4));
            q.deepEqual(res, require(__dirname + '/fixtures/search-ident.json'));
            q.end();
        });
    });
    t.test ('forward + geocoder_tokens', function(q) {
        geocoder.geocode('n korea', {}, function(err, res) {
            q.ifError(err);
            if (UPDATE) fs.writeFileSync(__dirname + '/fixtures/geocode-forward-tokens.json', JSON.stringify(res, null, 4));
            q.deepEqual(res, require(__dirname + '/fixtures/geocode-forward-tokens.json'));
            q.end();
        });
    });
    t.test ('string proximity geocoding', function(q) {
        geocoder.geocode('n korea', { proximity: "13.177876"}, function(err, res) {
            q.ifError(!err);
            q.end();
        });
    });
    t.test ('invalid proximity length', function(q) {
            geocoder.geocode('saint john', { proximity: [98.177876]}, function(err, res) {
                q.ifError(!err);
                q.end();
            });
    });
    t.test ('invalid proximity lat', function(q) {
            geocoder.geocode('n korea', { proximity: [98.177876,-59.504401]}, function(err, res) {
                q.ifError(!err);
                q.end();
            });
    });
    t.test ('invalid proximity lon', function(q) {
            geocoder.geocode('new york', { proximity: [58.177876,-200.504401]}, function(err, res) {
                q.ifError(!err);
                q.end();
            });
    });
    t.test ('text in proximity field', function(q) {
            geocoder.geocode('usa', { proximity: ["58d.177876","-200.5044s01"]}, function(err, res) {
                q.ifError(!err);
                q.end();
            });
    });
    t.test ('reverse', function(q) {
        geocoder.geocode('0, 40', {}, function(err, res) {
            q.ifError(err);
            if (UPDATE) fs.writeFileSync(__dirname + '/fixtures/geocode-reverse.json', JSON.stringify(res, null, 4));
            q.deepEqual(require(__dirname + '/fixtures/geocode-reverse.json'), res);
            q.end();
        });
    });
    t.test ('noresults', function(q) {
        geocoder.geocode('asdfasdf', {}, function(err, res) {
            q.ifError(err);
            if (UPDATE) fs.writeFileSync(__dirname + '/fixtures/geocode-noresults.json', JSON.stringify(res, null, 4));
            q.deepEqual(require(__dirname + '/fixtures/geocode-noresults.json'), res);
            q.end();
        });
    });
    t.end();
});
