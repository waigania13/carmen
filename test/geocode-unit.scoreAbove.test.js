// Tests Eiffel Tower (landmark) vs Eiffel Tower (dry cleaners)
// Eiffel Tower should win via scoreAbove bonus.

var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('d3-queue').queue;
var addFeature = require('../lib/util/addfeature');

(function() {
    var conf = {
        poi: new mem(null, function() {})
    };
    var c = new Carmen(conf);
    var tajMahalVarious = ['Taj Mahal Dry Cleaners', 'Taj Mahal Photos', 'Taj Mahal restaurant', 'Taj Mahal cafe']
    
    tape('index insignificant Taj Mahal pois (noise)', function(t) {
        var q = queue(1);
        for (var i = 1; i < 5; i++) q.defer(function(i, done) {
            addFeature(conf.poi, {
                id:i,
                properties: {
                    'carmen:score':i,
                    'carmen:text': tajMahalVarious[i-1],
                    'carmen:zxy':['6/32/32'],
                    'carmen:center':[i,0]
                }
            }, done);
        }, i);
        q.awaitAll(t.end);
    });
    
    tape('index Taj Mahal (landmark)', function(t) {
        addFeature(conf.poi, {
            id:5,
            properties: {
                'carmen:score': 300,
                'carmen:text': 'Taj Mahal',
                'carmen:zxy': ['6/33/32'],
                'carmen:center': [0,0]
            }
        }, t.end);
    });
    tape('scoreAbove = 1', function(t) {
        c.geocode('Taj Mahal', { scoreAbove:1 }, function(err, res) {
            t.equal(res.features.length, 5);
            t.end();
        });
    });
    tape('scoreAbove = 2', function(t) {
        c.geocode('Taj Mahal', { scoreAbove:1 }, function(err, res) {
            t.equal(res.features.length, 4);
            t.end();
        });
    });
    tape('scoreAbove = 3', function(t) {
        c.geocode('Taj Mahal', { scoreAbove:1 }, function(err, res) {
            t.equal(res.features.length, 3);
            t.end();
        });
    });
    tape('scoreAbove = 4', function(t) {
        c.geocode('Taj Mahal', { scoreAbove:1 }, function(err, res) {
            t.equal(res.features.length, 2);
            t.end();
        });
    });
})();

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});

