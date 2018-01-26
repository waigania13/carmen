const tape = require('tape');
const Carmen = require('..');
const mem = require('../lib/api-mem');
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

//skip interpolation for address clusters with large address ranges
(() => {
    const conf = {
        address: new mem({maxzoom: 6, geocoder_address: 1}, () => {})
    };
    const c = new Carmen(conf);
    tape('index address', (t) => {
        let address = {
            id:1,
            properties: {
                'carmen:text': 'fake street',
                'carmen:center': [0,0],
                'carmen:addressnumber': ['100', '101', '102', '106', '104', '5000']
            },
            geometry: {
                type: 'MultiPoint',
                //this is wrong will change
                coordinates: [[0,0],[0,0],[0,0],[0,0],[0,0],[0,0]]
            }
        };
        queueFeature(conf.address, address, () => { buildQueued(conf.address, t.end) });
    });
    tape('test address index', (t) => {
        //check if the address is not interpolised
        t.end();
    });
})();

//address range that increases in progression
(() => {
    const conf = {
        address: new mem({maxzoom: 14, geocoder_address: 1}, function() {})
    };
    const c = new Carmen(conf);
    tape('index address', (t) => {
        let address = {
            id:1,
            properties: {
                'carmen:text': 'WASHINGTON STREET',
                'carmen:center': [0,0],
                'carmen:addressnumber': ['70', '100a', '130', '160']
            },
            geometry: {
                type: 'MultiPoint',
                //change
                coordinates: [[0,0],[0,0],[0,0], [0,0]]
            }
        };
        queueFeature(conf.address, address, () => { buildQueued(conf.address, t.end) });
    }); 
    tape('test address index with a believable range ', (t) => {
        //should interpolize
        t.end();
    });
})();