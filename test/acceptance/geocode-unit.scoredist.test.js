'use strict';
// scoredist unit test

const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const addFeature = require('../../lib/indexer/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;
const queue = require('d3-queue').queue;

(() => {

    const conf = {
        address: new mem({ maxzoom: 6, maxscore: 100000 }, () => {}),
    };
    const c = new Carmen(conf);
    tape('index address (signal 1)', (t) => {
        queueFeature(conf.address, {
            id:200,
            properties: {
                'carmen:text':'main st',
                'carmen:zxy':['6/0/0'],
                'carmen:score':10000,
                'carmen:center':[-179.99,85]
            }
        }, t.end);
    });
    tape('index address (signal 2)', (t) => {
        queueFeature(conf.address, {
            id:201,
            properties: {
                'carmen:text':'main st',
                'carmen:zxy':['6/35/32'],
                'carmen:score':1000,
                'carmen:center':[20,0]
            }
        }, t.end);
    });
    tape('index address (noise)', (t) => {
        const q = queue(1);
        for (let i = 1; i < 100; i++) q.defer((i, done) => {
            queueFeature(conf.address, {
                id:i,
                properties: {
                    'carmen:text':'main st',
                    'carmen:zxy':['6/32/32'],
                    'carmen:score':50,
                    'carmen:center':[0,0]
                }
            }, done);
        }, i);
        q.awaitAll(t.end);
    });
    tape('build queued features', (t) => {
        const q = queue();
        Object.keys(conf).forEach((c) => {
            q.defer((cb) => {
                buildQueued(conf[c], cb);
            });
        });
        q.awaitAll(t.end);
    });
    // return the farther feature with a higher score
    tape('geocode proximity=10,10 => superscored', (t) => {
        c.geocode('main st', { proximity:[10,10] }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].id, 'address.200', 'found address.200');
            t.end();
        });
    });
    // return the closer feature with a lower score
    tape('geocode proximity=20,3 => nearest', (t) => {
        c.geocode('main st', { proximity:[20,3] }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].id, 'address.201', 'found address.201');
            t.end();
        });
    });
    tape('teardown', (t) => {
        context.getTile.cache.reset();
        t.end();
    });

})();

(() => {

    const conf = {
        poi: new mem({ maxzoom: 14, maxscore: 350 }, () => {}),
    };
    const c = new Carmen(conf);
    tape('index poi', (t) => {
        queueFeature(conf.poi, {
            id:200,
            properties: {
                'carmen:text':'airport',
                'carmen:zxy':['14/4000/10'],
                'carmen:score':300,
                'carmen:center':[-92.098388671875, 85.03118586530456]
            }
        }, t.end);
    });
    tape('index poi (noise)', (t) => {
        const q = queue(1);
        for (let i = 1; i < 100; i++) q.defer((i, done) => {
            queueFeature(conf.poi, {
                id:i,
                properties: {
                    'carmen:text':'airport',
                    'carmen:zxy':['14/4000/9'],
                    'carmen:score': 10,
                    'carmen:center':[-92.098388671875, 85.03308863057421]
                }
            }, done);
        }, i);
        q.awaitAll(t.end);
    });
    tape('build queued features', (t) => {
        const q = queue();
        Object.keys(conf).forEach((c) => {
            q.defer((cb) => {
                buildQueued(conf[c], cb);
            });
        });
        q.awaitAll(t.end);
    });
    // return the farther feature with a higher score
    tape('geocode proximity=-92.09,85.05 => superscored', (t) => {
        c.geocode('airport', { proximity:[-92.09, 85.05] }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].id, 'poi.200', 'found poi.200');
            t.end();
        });
    });
    tape('teardown', (t) => {
        context.getTile.cache.reset();
        t.end();
    });

})();
