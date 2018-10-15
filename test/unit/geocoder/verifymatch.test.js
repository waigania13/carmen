'use strict';
const verifymatch = require('../../../lib/geocoder/verifymatch');
const tape = require('tape');
const bigAddress = require('../../fixtures/bigaddress.json');

tape('verifymatch.sortFeature', (t) => {

    t.test('sort fake features in order', (t) => {
        const arr = [
            { id: 7, properties: { 'carmen:spatialmatch': { relev: 0.9 }, 'carmen:address': null } },
            { id: 6, properties: { 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:address': null } },
            { id: 5, properties: { 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:address': '26' }, geometry: { omitted: true } },
            { id: 4, properties: { 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:address': '26', 'carmen:distance': 5 }, geometry: {} },
            { id: 3, properties: { 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:address': '26', 'carmen:distance': 4 }, geometry: {} },
            { id: 2, properties: { 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:address': '26', 'carmen:distance': 3, 'carmen:position': 2 }, geometry: {} },
            { id: 1, properties: { 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:address': '26', 'carmen:distance': 2, 'carmen:position': 1 }, geometry: {} }
        ];
        arr.sort(verifymatch.sortFeature);
        t.deepEqual(arr.map((f) => { return f.id; }), [1,2,3,4,5,6,7]);
        t.end();
    });

    t.test('new york near san francisco', (t) => {
        // --query="new york" --proximity="-122.4234,37.7715"
        const input = [
            { properties: { text: 'New York,NY,NYC,New York City', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 2567.3550038898834, 'carmen:score': 31104 } },
            { properties: { text: 'New Yorker Buffalo Wings', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 0.6450163846417221, 'carmen:score': 3 } },
            { properties: { text: 'New York Frankfurter Co.', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 0.4914344651849769, 'carmen:score': 1 } },
            { properties: { text: 'New York,NY', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 2426.866703400975, 'carmen:score': 79161 } }
        ];

        const expected = [
            { properties: { text: 'New York Frankfurter Co.', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 0.4914344651849769, 'carmen:score': 1 } },
            { properties: { text: 'New Yorker Buffalo Wings', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 0.6450163846417221, 'carmen:score': 3 } },
            { properties: { text: 'New York,NY', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 2426.866703400975, 'carmen:score': 79161 } },
            { properties: { text: 'New York,NY,NYC,New York City', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 2567.3550038898834, 'carmen:score': 31104 } }
        ];

        t.deepEqual(input.sort(verifymatch.sortFeature), expected);
        t.end();
    });

    t.test('chicago near san francisco', (t) => {
        // --query="chicago" --proximity="-122.4234,37.7715"
        const input = [
            { properties: { text: 'Chicago', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 1855.8900334142313, 'carmen:score': 16988 } },
            { properties: { text: 'Chicago Title', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 0.14084037845690478, 'carmen:score': 2 } }
        ];

        const expected = [
            { properties: { text: 'Chicago Title', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 0.14084037845690478, 'carmen:score': 2 } },
            { properties: { text: 'Chicago', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 1855.8900334142313, 'carmen:score': 16988 } }
        ];

        t.deepEqual(input.sort(verifymatch.sortFeature), expected);
        t.end();
    });

    t.test('san near north sonoma county', (t) => {
        // --query="san" --proximity="-123.0167,38.7471"
        const input = [
            { properties: { text: 'Santa Cruz', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 133.8263938095184, 'carmen:score': 587 } },
            { properties: { text: 'São Paulo', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 6547.831697209755, 'carmen:score': 36433 } },
            { properties: { text: 'Santiago Metropolitan,METROPOLITANA,Región Metropolitana de Santiago', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 6023.053777668511, 'carmen:score': 26709 } },
            { properties: { text: 'San Francisco', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 74.24466022598429, 'carmen:score': 8015 } }
        ];

        const expected = [
            { properties: { text: 'San Francisco', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 74.24466022598429, 'carmen:score': 8015 } },
            { properties: { text: 'Santa Cruz', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 133.8263938095184, 'carmen:score': 587 } },
            { properties: { text: 'Santiago Metropolitan,METROPOLITANA,Región Metropolitana de Santiago', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 6023.053777668511, 'carmen:score': 26709 } },
            { properties: { text: 'São Paulo', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 6547.831697209755, 'carmen:score': 36433 } }
        ];

        t.deepEqual(input.sort(verifymatch.sortFeature), expected);
        t.end();
    });

    t.test('santa cruz near sonoma county', (t) => {
        // --query="santa cruz" --proximity="-123.0167,38.7471"
        const input = [
            { properties: { text: 'Santa Cruz', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 133.8263938095184, 'carmen:score': 587 } },
            { properties: { text: 'Santa Cruz de Tenerife', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 5811.283048403849, 'carmen:score': 3456 } }
        ];

        const expected = [
            { properties: { text: 'Santa Cruz', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 133.8263938095184, 'carmen:score': 587 } },
            { properties: { text: 'Santa Cruz de Tenerife', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 5811.283048403849, 'carmen:score': 3456 } }
        ];

        t.deepEqual(input.sort(verifymatch.sortFeature), expected);
        t.end();
    });

    t.test('washington near baltimore', (t) => {
        // --query="washington" --proximity="-76.6035,39.3008"
        const input = [
            { properties: { text: 'Washington,DC', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 34.81595024835296, 'carmen:score': 7400 } },
            { properties: { text: 'Washington,WA', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 2256.6130314083157, 'carmen:score': 33373 } }
        ];

        const expected = [
            { properties: { text: 'Washington,DC', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 34.81595024835296, 'carmen:score': 7400 } },
            { properties: { text: 'Washington,WA', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 2256.6130314083157, 'carmen:score': 33373 } }
        ];

        t.deepEqual(input.sort(verifymatch.sortFeature), expected);
        t.end();
    });

    t.test('gilmour ave near guelph, on, canada', (t) => {
        // --query="gilmour ave" --proximity="-80.1617,43.4963"
        const input = [
            { properties: { text: 'Gilmour Ave, Runnymede, Toronto, M6P 3B5, Ontario, Canada, CA', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 36.12228253928214, 'carmen:score': 0 } },
            { properties: { text: 'Gilmour Ave, Hillendale, Kingston, K7M 2Y8, Ontario, Canada, CA', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 188.29482550861198, 'carmen:score': 0 } },
            { properties: { text: 'Gilmour Ave, Somerset, 15501, Pennsylvania, United States', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 246.29759329605977, 'carmen:score': 0 } },
            { properties: { text: 'Gilmour Avenue, West Dunbartonshire, G81 6AN, West Dunbartonshire, United Kingdom', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 3312.294287119006, 'carmen:score': 3 } }
        ];

        const expected = [
            { properties: { text: 'Gilmour Ave, Runnymede, Toronto, M6P 3B5, Ontario, Canada, CA', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 36.12228253928214, 'carmen:score': 0 } },
            { properties: { text: 'Gilmour Ave, Hillendale, Kingston, K7M 2Y8, Ontario, Canada, CA', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 188.29482550861198, 'carmen:score': 0 } },
            { properties: { text: 'Gilmour Ave, Somerset, 15501, Pennsylvania, United States', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 246.29759329605977, 'carmen:score': 0 } },
            { properties: { text: 'Gilmour Avenue, West Dunbartonshire, G81 6AN, West Dunbartonshire, United Kingdom', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 3312.294287119006, 'carmen:score': 3 } }
        ];

        t.deepEqual(input.sort(verifymatch.sortFeature), expected);
        t.end();
    });

    t.test('cambridge near guelph, on, canada', (t) => {
        // --query="cambridge" --proximity="-80.1617,43.4963"
        const input = [
            { properties: { text: 'Cambridge, N1R 6A9, Ontario, Canada, CA', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 10.73122383596493, 'carmen:score': 294 } },
            { properties: { text: 'Cambridge, 02139, Massachusetts, United States', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 464.50390088754625, 'carmen:score': 986 } },
            { properties: { text: 'Cambridgeshire, United Kingdom', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 3566.2969841802374, 'carmen:score': 2721 } }
        ];

        const expected = [
            { properties: { text: 'Cambridge, N1R 6A9, Ontario, Canada, CA', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 10.73122383596493, 'carmen:score': 294 } },
            { properties: { text: 'Cambridge, 02139, Massachusetts, United States', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 464.50390088754625, 'carmen:score': 986 } },
            { properties: { text: 'Cambridgeshire, United Kingdom', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 3566.2969841802374, 'carmen:score': 2721 } }
        ];

        t.deepEqual(input.sort(verifymatch.sortFeature), expected);
        t.end();
    });

    t.test('united states near washington dc', (t) => {
        // --query="United States" --proximity="-77.03361679999999,38.900039899999996"
        const input = [
            { properties: { text: 'United States of America, United States, America, USA, US', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 1117.3906777683906, 'carmen:score': 1634443 } },
            { properties: { text: 'United States Department of Treasury Annex', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 0.11774815645353183, 'carmen:score': 0 } },
        ];

        const expected = [
            { properties: { text: 'United States Department of Treasury Annex', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 0.11774815645353183, 'carmen:score': 0 } },
            { properties: { text: 'United States of America, United States, America, USA, US', 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:distance': 1117.3906777683906, 'carmen:score': 1634443 } }
        ];

        t.deepEqual(input.sort(verifymatch.sortFeature), expected);
        t.end();
    });

    t.end();
});

tape('verifymatch.sortContext (with distance)', (t) => {
    let c;
    const arr = [];

    c = [{ id: 10, properties: {} }];
    c._relevance = 0.9;
    arr.push(c);

    c = [{ id: 9, properties: { 'carmen:address': '26' } }];
    c._relevance = 1.0;
    arr.push(c);

    c = [{ id: 8, properties: { 'carmen:address': '26', 'carmen:addressnumber': [] }, geometry: { omitted: true } }];
    c._relevance = 1.0;
    arr.push(c);

    c = [{ id: 7, properties: { 'carmen:address': '26', 'carmen:addressnumber': [] }, geometry: {} }];
    c._relevance = 1.0;
    arr.push(c);

    c = [{ id: 6, properties: { 'carmen:address': '26', 'carmen:addressnumber': [], 'carmen:distance': 2 }, geometry: {} }];
    c._relevance = 1.0;
    arr.push(c);

    c = [{ id: 5, properties: { 'carmen:address': '26', 'carmen:addressnumber': [], 'carmen:distance': 1 }, geometry: {} }];
    c._relevance = 1.0;
    arr.push(c);

    c = [{ id: 4, properties: { 'carmen:address': '26', 'carmen:addressnumber': [], 'carmen:distance': 1 }, geometry: {} }];
    c._relevance = 1.0;
    c._typeindex = 2;
    arr.push(c);

    c = [{ id: 3, properties: { 'carmen:address': '26', 'carmen:addressnumber': [], 'carmen:distance': 1 }, geometry: {} }];
    c._relevance = 1.0;
    c._typeindex = 1;
    arr.push(c);

    c = [{ id: 2, properties: { 'carmen:address': '26', 'carmen:addressnumber': [], 'carmen:distance': 1 }, geometry: {} }];
    c._relevance = 1.0;
    c._typeindex = 1;
    arr.push(c);

    c = [{ id: 1, properties: { 'carmen:address': '26', 'carmen:addressnumber': [], 'carmen:distance': 1, 'carmen:position': 2 }, geometry: {} }];
    c._relevance = 1.0;
    c._typeindex = 1;
    arr.push(c);

    c = [{ id: 0, properties: { 'carmen:address': '26', 'carmen:addressnumber': [], 'carmen:distance': 1, 'carmen:position': 1 }, geometry: {} }];
    c._relevance = 1.0;
    c._typeindex = 1;
    arr.push(c);

    arr.sort(verifymatch.sortContext);
    t.deepEqual(arr.map((c) => { return c[0].id; }), [0,1,2,3,4,5,6,7,8,9,10]);

    t.end();
});

tape('verifymatch.sortContext (distance vs addresstype)', (t) => {
    let c;
    const arr = [];

    c = [{ id: 3 }];
    c._relevance = 0.9;
    arr.push(c);

    c = [{ id: 2, properties: { 'carmen:address': '26', 'carmen:addressnumber': [], 'carmen:distance': 2 } }];
    c._relevance = 1.0;
    arr.push(c);

    c = [{ id: 1, properties: { 'carmen:address': '26' , 'carmen:distance': 1 } }];
    c._relevance = 1.0;
    arr.push(c);

    arr.sort(verifymatch.sortContext);
    t.deepEqual(arr.map((c) => { return c[0].id; }), [1,2,3]);

    t.end();
});

tape('verifymatch.verifyFeatures', (t) => {
    const doc = bigAddress;
    const query = ['9', 'stationsplein'];
    const spatialmatches = [{ 'relev':1,'covers':[{ 'x':33,'y':21,'relev':1,'id':558998,'idx':0,'tmpid':558998,'distance':0,'score':19,'scoredist':19,'scorefactor':19,'matches_language':true,'prefix':true,'mask':3,'text':'# stationsplein','zoom':6 }] }];
    const geocoder = {
        byidx: {
            0: {
                geocoder_address: true
            }
        }
    };
    doc.properties['carmen:addressnumber'] = [doc.properties['carmen:addressnumber']];
    doc.geometry = {
        type: 'GeometryCollection',
        geometries: [
            doc.geometry
        ]
    };
    doc.properties['carmen:types'] = ['address'];
    const filtered = verifymatch.verifyFeatures(query, geocoder, spatialmatches, [doc], {});
    t.ok(filtered.length <= 10, 'limit dupe address numbers to 10');
    t.end();

});
