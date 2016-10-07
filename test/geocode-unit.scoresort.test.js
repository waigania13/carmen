// scoredist unit test

var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature');
var queue = require('d3-queue').queue;

(function() {

    var conf = {
        region: new mem(null, function() {}),
        place: new mem(null, function() {})
    };
    var c = new Carmen(conf);
    // very high max score in region index
    tape('index region (high score)', function(t) {
        addFeature(conf.region, {
            id:1,
            properties: {
                'carmen:text':'bigtown',
                'carmen:zxy':['6/32/32'],
                'carmen:score':100000,
                'carmen:center':[0,0]
            }
        }, t.end);
    });

    // Many low-scored features in region index
    tape('index region (low score)', function(t) {
        var q = queue(1);
        for (var i =2; i < 22; i++) q.defer(function(i, done) {
            addFeature(conf.region, {
                id:i,
                properties: {
                    'carmen:text':'smallville' + i,
                    'carmen:zxy':['6/32/32'],
                    'carmen:score':1,
                    'carmen:center':[0,0]
                }
            }, done);
        }, i);
        q.awaitAll(t.end);
    });

    // Feature is scored higher than all but one region
    tape('index place (high score)', function(t) {
        addFeature(conf.place, {
            id:1,
            properties: {
                'carmen:text':'smallville1',
                'carmen:zxy':['6/32/32'],
                'carmen:score':10000,
                'carmen:center':[0,0]
            }
        }, t.end);
    });

    // place is excluded from results, even though it has the highest score
    tape('geocode little', function(t) {
        c.geocode('smallville', null, function(err, res) {
            t.ifError(err);
            res.features.forEach(function(feat) {
                t.equal(feat.id.startsWith('region'), true, "feature type is region");
                t.equal(feat.text.startsWith('smallville'), true, "no high-scored feature is included");
            });
            t.end();
        });
    });
    tape('teardown', function(assert) {
        context.getTile.cache.reset();
        assert.end();
    });

})();
