'use strict';
const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const { queueFeature, buildQueued } = require('../../lib/indexer/addfeature');

const country = new mem(null, () => {});
const conf = { country: country };
const a = new Carmen(conf);

tape('index country', (t) => {
    const countryDoc = {
        id:1,
        properties: {
            'carmen:text':'america',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    queueFeature(conf.country, countryDoc, (err) => {
        t.ifError(err);
        buildQueued(conf.country, (err) => {
            t.ifError(err);
            t.ok(country._geocoder, 'sets source._geocoder on original instance');
            t.ok(country._dictcache, 'sets source._dictcache on original instance');
            t.equal(country._geocoder, a.indexes.country._geocoder, 'clone cache === source cache');
            t.equal(country._dictcache, a.indexes.country._dictcache, 'clone dictcache === source dictcache');
            t.end();
        });
    });
});

tape('geocodes', (t) => {
    a.geocode('america', {}, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'america');
        t.deepEqual(res.features[0].id, 'country.1');
        t.end();
    });
});
tape('sets cache/dictcache', (t) => {
    const b = new Carmen({ country: country });
    t.equal(b.indexes.country._geocoder, a.indexes.country._geocoder, 'a cache === b cache');
    t.equal(b.indexes.country._dictcache, a.indexes.country._dictcache, 'a dictcache === b dictcache');
    t.end();
});
tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
