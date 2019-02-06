'use strict';
const tape = require('tape');
const Carmen = require('../..');
const mem = require('../../lib/sources/api-mem');
const queue = require('d3-queue').queue;
const { queueFeature, buildQueued } = require('../../lib/indexer/addfeature');
const extent = require('@turf/bbox').default;

const fr_sample = {
    'type':'Feature',
    'properties':{
        'carmen:addressnumber':['9','35','51','63','64','71','85','86','97','100','131','146','166','382','384','406','432','447','504','509','529','540','551','557','564','577','580','633','680','688','693','735','737','740','753','5000'],
        'carmen:text':'Route De Saint-Firmin Des Vignes,Rue De Saint-Firmin Des Vignes',
        'carmen:geocoder_stack':'fr',
        'carmen:center':[2.738896,47.976618]
    },
    'geometry':{
        'type': 'MultiPoint',
        'coordinates':[[2.743338,47.975112],[2.743055,47.975205],[2.742837,47.975259],[2.742722,47.975299],[2.742649,47.975425],[2.742639,47.975326],[2.742454,47.975389],[2.742372,47.975521],[2.74224,47.975451],[2.742417,47.975505],[2.741927,47.975542],[2.741809,47.975725],[2.741874,47.975675],[2.738917,47.976612],[2.738896,47.976618],[2.738667,47.976751],[2.738364,47.976845],[2.737942,47.976792],[2.737434,47.977034],[2.737406,47.976957],[2.737045,47.97707],[2.737397,47.977046],[2.73768,47.976885],[2.73673,47.977168],[2.73737,47.977057],[2.736447,47.977258],[2.737352,47.977062],[2.735665,47.977504],[2.737246,47.977102],[2.737237,47.977104],[2.737251,47.977016],[2.737123,47.977055],[2.734954,47.977713],[2.737182,47.977124],[2.734155,47.977959],[2.743297,47.975212]]
    },
    'id':395484891
};

const us_sample = {
    type:'Feature',
    id:1,
    properties: {
        'carmen:text':'Evergreen Terrace',
        'carmen:center':[0,0],
        'carmen:geocoder_stack': 'us',
        'carmen:addressnumber': ['742']
    },
    geometry: {
        type: 'MultiPoint',
        coordinates: [[0,0]]
    }
};

const conf = {
    fr_address: new mem({ maxzoom: 6, geocoder_address: 1, geocoder_name:'address', bounds: extent(fr_sample) }, () => {}),
    us_address: new mem({ maxzoom: 6, geocoder_address: 1, geocoder_name:'address', bounds: extent(us_sample) }, () => {})
};
const c = new Carmen(conf);

tape('index addresses', (t) => {
    queueFeature(conf.fr_address, fr_sample, () => {
        queueFeature(conf.us_address, us_sample, t.end);
    });
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

tape('geocode with in-index prox for france', (t) => {
    c.geocode('7', { proximity: [2.73737,47.977057] }, (err, res) => {
        t.ifError(err);
        t.equal(res.features.length, 1, 'only one result returned');
        t.equal(res.features[0].id, 'address.395484891', 'result was from expected index');
        t.assert(res.features[0].address.startsWith('7'), 'prefix matches');
        t.end();
    });
});

tape('geocode with in-index prox for us', (t) => {
    c.geocode('7', { proximity: [0,0] }, (err, res) => {
        t.ifError(err);
        t.equal(res.features.length, 1, 'only one result returned');
        t.equal(res.features[0].id, 'address.1', 'result was from expected index');
        t.assert(res.features[0].address.startsWith('7'), 'prefix matches');
        t.end();
    });
});

tape('geocode with out-of-index prox', (t) => {
    c.geocode('7', { proximity: [-50,-50] }, (err, res) => {
        t.ifError(err);
        t.equal(res.features.length, 0, 'no results returned');
        t.end();
    });
});
