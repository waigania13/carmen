const suite = new require('benchmark').Suite();

const Carmen = require('..');
const index = require('../lib/indexer/index');
const queue = require('d3-queue').queue;
const phrasematch = require('../lib/geocoder/phrasematch');
const mem = require('../lib/sources/api-mem');
const { queueFeature, buildQueued } = require('../lib/indexer/addfeature');

const conf = { street: new mem({ maxzoom:14 }, () => {}) };
const c = new Carmen(conf);

// TODO: use addFeature/buildQueue pattern <29-06-18, boblannon> //
module.exports = setup;

function setup(cb) {
    if (!cb) cb = function(){};
    console.log('# geocode');
    const start = +new Date;
    // streetnames with "Lake" from TIGER
    const q = queue();
    let seq = 1;
    let docs = require('fs').readFileSync(__dirname + '/fixtures/lake-streetnames.txt', 'utf8')
        .split('\n')
        .filter(function(text) { return !!text; })
        .slice(0, 500)
        .reduce(function(memo, text) {
            // generate between 1-100 features with this text.
            const seed = 100;
            for (let i = 0; i < seed; i++) {
                const lat = Math.random() * 170 - 85;
                const lon = Math.random() * 360 - 180;
                memo.push({
                    id: ++seq,
                    type: 'Feature',
                    properties: {
                        'carmen:text': text,
                        'carmen:center': [lon, lat]
                    },
                    geometry: { type:'Point', coordinates:[lon,lat] }
                });
            }
            return memo;
        }, []);

    queueFeature(conf.street, docs, () => {
        console.log('setup time ' + (+new Date - start) + 'ms');
        buildQueued(conf.street, () => {
            runBenchmark(cb);
        });
    });
}

function runBenchmark(cb) {
    suite.add('geocode', {
        'defer': true,
        'fn': geocode
    })
    .on('complete', function(event) {
        console.log(String(event.target), '\n');
        cb(null, suite);
    })
    .run({'async': true});
}

function geocode(deferred) {
    c.geocode('Lake Camile Dr', {}, function (err, res) {
        if (err || (res && !res.features.length)) throw err;
        deferred.resolve();
    });
}

if (!process.env.runSuite) setup();
