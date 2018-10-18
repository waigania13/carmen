'use strict';
const test = require('tape');
const constants = require('../../../lib/constants');
const proximity = require('../../../lib/util/proximity');

const ZOOM_LEVELS = {
    address: 14,
    poi: 14,
    place: 12,
    region: 6,
    district: 9,
    country: 6
};

function compareScoreDist(a, b) {
    return b.properties['carmen:scoredist'] - a.properties['carmen:scoredist'];
}

function calculteScoreDist(input) {
    for (let k = 0; k < input.length; k++) {
        const feat = input[k];
        // ghost features don't participate
        if (feat.properties['carmen:score'] >= 0) {
            feat.properties['carmen:scoredist'] = proximity.scoredist(feat.properties['carmen:score'], feat.properties['carmen:distance'], feat.properties['carmen:zoom'], constants.PROXIMITY_RADIUS);
        } else {
            feat.properties['carmen:scoredist'] = feat.properties['carmen:score'];
        }
    }
}

test('scoredist', (t) => {

    t.test('new york near san francisco', (t) => {
        // --query="new york" --proximity="-122.4234,37.7715"
        const input = [
            { properties: { 'carmen:text': 'New York,NY,NYC,New York City', 'carmen:distance': 2567.3550038898834, 'carmen:score': 31104, 'carmen:zoom': ZOOM_LEVELS.place } },
            { properties: { 'carmen:text': 'New Yorker Buffalo Wings', 'carmen:distance': 0.6450163846417221, 'carmen:score': 3, 'carmen:zoom': ZOOM_LEVELS.poi } },
            { properties: { 'carmen:text': 'New York Frankfurter Co.', 'carmen:distance': 0.4914344651849769, 'carmen:score': 1, 'carmen:zoom': ZOOM_LEVELS.poi } },
            { properties: { 'carmen:text': 'New York,NY', 'carmen:distance': 2426.866703400975, 'carmen:score': 79161, 'carmen:zoom': ZOOM_LEVELS.region } }
        ];

        const expected = [
            { properties: { 'carmen:text': 'New York,NY', 'carmen:distance': 2426.866703400975, 'carmen:score': 79161, 'carmen:zoom': ZOOM_LEVELS.region, 'carmen:scoredist': 79161 } },
            { properties: { 'carmen:text': 'New York,NY,NYC,New York City', 'carmen:distance': 2567.3550038898834, 'carmen:score': 31104, 'carmen:zoom': ZOOM_LEVELS.place, 'carmen:scoredist': 31104 } },
            { properties: { 'carmen:text': 'New York Frankfurter Co.', 'carmen:distance': 0.4914344651849769, 'carmen:score': 1, 'carmen:zoom': ZOOM_LEVELS.poi, 'carmen:scoredist': 29172.6105 } },
            { properties: { 'carmen:text': 'New Yorker Buffalo Wings', 'carmen:distance': 0.6450163846417221, 'carmen:score': 3, 'carmen:zoom': ZOOM_LEVELS.poi, 'carmen:scoredist': 29127.7135 } }
        ];

        calculteScoreDist(input);
        t.deepEqual(input.sort(compareScoreDist), expected);
        t.end();
    });

    t.test('chicago near san francisco', (t) => {
        // --query="chicago" --proximity="-122.4234,37.7715"
        const input = [
            { properties: { 'carmen:text': 'Chicago', 'carmen:distance': 1855.8900334142313, 'carmen:score': 16988, 'carmen:zoom': ZOOM_LEVELS.place } },
            { properties: { 'carmen:text': 'Chicago Title', 'carmen:distance': 0.14084037845690478, 'carmen:score': 2, 'carmen:zoom': ZOOM_LEVELS.poi } }
        ];

        const expected = [
            { properties: { 'carmen:text': 'Chicago Title', 'carmen:distance': 0.14084037845690478, 'carmen:score': 2, 'carmen:zoom': ZOOM_LEVELS.poi, 'carmen:scoredist': 18406.6285 } },
            { properties: { 'carmen:text': 'Chicago', 'carmen:distance': 1855.8900334142313, 'carmen:score': 16988, 'carmen:zoom': ZOOM_LEVELS.place, 'carmen:scoredist': 16988 } }
        ];

        calculteScoreDist(input);
        t.deepEqual(input.sort(compareScoreDist), expected);
        t.end();
    });

    t.test('san near north sonoma county', (t) => {
        // --query="san" --proximity="-123.0167,38.7471"
        const input = [
            { properties: { 'carmen:text': 'Santa Cruz', 'carmen:distance': 133.8263938095184, 'carmen:score': 587, 'carmen:zoom': ZOOM_LEVELS.place } },
            { properties: { 'carmen:text': 'São Paulo', 'carmen:distance': 6547.831697209755, 'carmen:score': 36433, 'carmen:zoom': ZOOM_LEVELS.place } },
            { properties: { 'carmen:text': 'Santiago Metropolitan,METROPOLITANA,Región Metropolitana de Santiago', 'carmen:distance': 6023.053777668511, 'carmen:score': 26709, 'carmen:zoom': ZOOM_LEVELS.place } },
            { properties: { 'carmen:text': 'San Francisco', 'carmen:distance': 74.24466022598429, 'carmen:score': 8015, 'carmen:zoom': ZOOM_LEVELS.place } }
        ];

        const expected = [
            { properties: { 'carmen:text': 'San Francisco', 'carmen:distance': 74.24466022598429, 'carmen:score': 8015, 'carmen:zoom': ZOOM_LEVELS.place, 'carmen:scoredist': 631594.6334 } },
            { properties: { 'carmen:text': 'Santa Cruz', 'carmen:distance': 133.8263938095184, 'carmen:score': 587, 'carmen:zoom': ZOOM_LEVELS.place, 'carmen:scoredist': 496553.9131 } },
            { properties: { 'carmen:text': 'São Paulo', 'carmen:distance': 6547.831697209755, 'carmen:score': 36433, 'carmen:zoom': ZOOM_LEVELS.place, 'carmen:scoredist': 36433 } },
            { properties: { 'carmen:text': 'Santiago Metropolitan,METROPOLITANA,Región Metropolitana de Santiago', 'carmen:distance': 6023.053777668511, 'carmen:score': 26709, 'carmen:zoom': ZOOM_LEVELS.place, 'carmen:scoredist': 26709 } }
        ];

        calculteScoreDist(input);
        t.deepEqual(input.sort(compareScoreDist), expected);
        t.end();
    });

    t.test('santa cruz near sonoma county', (t) => {
        // --query="santa cruz" --proximity="-123.0167,38.7471"
        const input = [
            { properties: { 'carmen:text': 'Santa Cruz', 'carmen:distance': 133.8263938095184, 'carmen:score': 587, 'carmen:zoom': ZOOM_LEVELS.place } },
            { properties: { 'carmen:text': 'Santa Cruz de Tenerife', 'carmen:distance': 5811.283048403849, 'carmen:score': 3456, 'carmen:zoom': ZOOM_LEVELS.place } }
        ];

        const expected = [
            { properties: { 'carmen:text': 'Santa Cruz', 'carmen:distance': 133.8263938095184, 'carmen:score': 587, 'carmen:zoom': ZOOM_LEVELS.place, 'carmen:scoredist': 85980.2649 } },
            { properties: { 'carmen:text': 'Santa Cruz de Tenerife', 'carmen:distance': 5811.283048403849, 'carmen:score': 3456, 'carmen:zoom': ZOOM_LEVELS.place, 'carmen:scoredist': 3456 } }
        ];
        calculteScoreDist(input);
        t.deepEqual(input.sort(compareScoreDist), expected);
        t.end();
    });

    t.test('washington near baltimore', (t) => {
        // --query="washington" --proximity="-76.6035,39.3008"
        const input = [
            { properties: { 'carmen:text': 'Washington,DC', 'carmen:distance': 34.81595024835296, 'carmen:score': 7400, 'carmen:zoom': ZOOM_LEVELS.place } },
            { properties: { 'carmen:text': 'Washington,WA', 'carmen:distance': 2256.6130314083157, 'carmen:score': 33373, 'carmen:zoom': ZOOM_LEVELS.region } }
        ];

        const expected = [
            { properties: { 'carmen:text': 'Washington,DC', 'carmen:distance': 34.81595024835296, 'carmen:score': 7400, 'carmen:zoom': ZOOM_LEVELS.place, 'carmen:scoredist': 1394410.9267 } },
            { properties: { 'carmen:text': 'Washington,WA', 'carmen:distance': 2256.6130314083157, 'carmen:score': 33373, 'carmen:zoom': ZOOM_LEVELS.region, 'carmen:scoredist': 33373 } }
        ];
        calculteScoreDist(input);
        t.deepEqual(input.sort(compareScoreDist), expected);
        t.end();
    });

    t.test('gilmour ave near guelph, on, canada', (t) => {
        // --query="gilmour ave" --proximity="-80.1617,43.4963"
        const input = [
            { properties: { 'carmen:text': 'Gilmour Ave, Runnymede, Toronto, M6P 3B5, Ontario, Canada, CA', 'carmen:distance': 36.12228253928214, 'carmen:score': 0, 'carmen:zoom': ZOOM_LEVELS.address } },
            { properties: { 'carmen:text': 'Gilmour Ave, Hillendale, Kingston, K7M 2Y8, Ontario, Canada, CA', 'carmen:distance': 188.29482550861198, 'carmen:score': 0, 'carmen:zoom': ZOOM_LEVELS.address } },
            { properties: { 'carmen:text': 'Gilmour Ave, Somerset, 15501, Pennsylvania, United States', 'carmen:distance': 246.29759329605977, 'carmen:score': 0, 'carmen:zoom': ZOOM_LEVELS.address } },
            { properties: { 'carmen:text': 'Gilmour Avenue, West Dunbartonshire, G81 6AN, West Dunbartonshire, United Kingdom', 'carmen:distance': 3312.294287119006, 'carmen:score': 3, 'carmen:zoom': ZOOM_LEVELS.address } }
        ];

        const expected = [
            { properties: { 'carmen:text': 'Gilmour Ave, Runnymede, Toronto, M6P 3B5, Ontario, Canada, CA', 'carmen:distance': 36.12228253928214, 'carmen:score': 0, 'carmen:zoom': ZOOM_LEVELS.address, 'carmen:scoredist': 88.3609 } },
            { properties: { 'carmen:text': 'Gilmour Avenue, West Dunbartonshire, G81 6AN, West Dunbartonshire, United Kingdom', 'carmen:distance': 3312.294287119006, 'carmen:score': 3, 'carmen:zoom': ZOOM_LEVELS.address, 'carmen:scoredist': 3 } },
            { properties: { 'carmen:text': 'Gilmour Ave, Hillendale, Kingston, K7M 2Y8, Ontario, Canada, CA', 'carmen:distance': 188.29482550861198, 'carmen:score': 0, 'carmen:zoom': ZOOM_LEVELS.address, 'carmen:scoredist': 0.4508 } },
            { properties: { 'carmen:text': 'Gilmour Ave, Somerset, 15501, Pennsylvania, United States', 'carmen:distance': 246.29759329605977, 'carmen:score': 0, 'carmen:zoom': ZOOM_LEVELS.address, 'carmen:scoredist': 0 } }
        ];
        calculteScoreDist(input);
        t.deepEqual(input.sort(compareScoreDist), expected);
        t.end();
    });

    t.test('cambridge near guelph, on, canada', (t) => {
        // --query="cambridge" --proximity="-80.1617,43.4963"
        const input = [
            { properties: { 'carmen:text': 'Cambridge, N1R 6A9, Ontario, Canada, CA', 'carmen:distance': 10.73122383596493, 'carmen:score': 294, 'carmen:zoom': ZOOM_LEVELS.place } },
            { properties: { 'carmen:text': 'Cambridge, 02139, Massachusetts, United States', 'carmen:distance': 464.50390088754625, 'carmen:score': 986, 'carmen:zoom': ZOOM_LEVELS.place } },
            { properties: { 'carmen:text': 'Cambridgeshire, United Kingdom', 'carmen:distance': 3566.2969841802374, 'carmen:score': 2721, 'carmen:zoom': ZOOM_LEVELS.district } }
        ];

        const expected = [
            { properties: { 'carmen:text': 'Cambridge, N1R 6A9, Ontario, Canada, CA', 'carmen:distance': 10.73122383596493, 'carmen:score': 294, 'carmen:zoom': ZOOM_LEVELS.place, 'carmen:scoredist': 89120.0225 } },
            { properties: { 'carmen:text': 'Cambridge, 02139, Massachusetts, United States', 'carmen:distance': 464.50390088754625, 'carmen:score': 986, 'carmen:zoom': ZOOM_LEVELS.place, 'carmen:scoredist': 4711.9645 } },
            { properties: { 'carmen:text': 'Cambridgeshire, United Kingdom', 'carmen:distance': 3566.2969841802374, 'carmen:score': 2721, 'carmen:zoom': ZOOM_LEVELS.district, 'carmen:scoredist': 2721 } }
        ];
        calculteScoreDist(input);
        t.deepEqual(input.sort(compareScoreDist), expected);
        t.end();
    });

    t.test('united states near washington dc', (t) => {
        // --query="United States" --proximity="-77.03361679999999,38.900039899999996"
        const input = [
            { properties: { 'carmen:text': 'United States of America, United States, America, USA, US', 'carmen:distance': 1117.3906777683906, 'carmen:score': 1634443, 'carmen:zoom': ZOOM_LEVELS.country } },
            { properties: { 'carmen:text': 'United States Department of Treasury Annex', 'carmen:distance': 0.11774815645353183, 'carmen:score': 0, 'carmen:zoom': ZOOM_LEVELS.poi } },
        ];

        const expected = [
            { properties: { 'carmen:text': 'United States of America, United States, America, USA, US', 'carmen:distance': 1117.3906777683906, 'carmen:score': 1634443, 'carmen:zoom': ZOOM_LEVELS.country, 'carmen:scoredist': 1634443 } },
            { properties: { 'carmen:text': 'United States Department of Treasury Annex', 'carmen:distance': 0.11774815645353183, 'carmen:score': 0, 'carmen:zoom': ZOOM_LEVELS.poi, 'carmen:scoredist': 127694.845 } }
        ];
        calculteScoreDist(input);
        t.deepEqual(input.sort(compareScoreDist), expected);
        t.end();
    });

    t.test('missi near mission neighborhood san francisco', (t) => {
        // --query="missi" --proximity="-122.4213562,37.75234222"
        const input = [
            { id: 20, properties: { 'carmen:text': 'Mission District', 'carmen:distance': 0.641155642372423, 'carmen:score': -1, 'carmen:zoom': 12 } },
            { id: 14, properties: { 'carmen:text': 'Mission Terrace', 'carmen:distance': 2.0543295828567985, 'carmen:score': 50, 'carmen:zoom': 12 } },
            { id: 2, properties: { 'carmen:text': 'Mission', 'carmen:distance': 0.5365405586195869, 'carmen:score': 609, 'carmen:zoom': 12 } },
            { id: 15, properties: { 'carmen:text': 'Mission Bay', 'carmen:distance': 2.083206525530076, 'carmen:score': 46, 'carmen:zoom': 12 } },
            { id: 19, properties: { 'carmen:text': 'Mission Dolores', 'carmen:distance': 0.8734705397622807, 'carmen:score': -1, 'carmen:zoom': 12 } },
            { id: 3, properties: { 'carmen:text': 'Mission Branch Library', 'carmen:distance': 0.09171422623336412, 'carmen:score': 0, 'carmen:zoom': 14 } },
            { id: 10, properties: { 'carmen:text': 'Mission Tires & Service Center', 'carmen:distance': 0.41252770420569307, 'carmen:score': 0, 'carmen:zoom': 14 } },
            { id: 12, properties: { 'carmen:text': 'Mission Dental Care', 'carmen:distance': 0.47809299593103194, 'carmen:score': 0, 'carmen:zoom': 14 } },
            { id: 7, properties: { 'carmen:text': 'Mission Pie,cafe, coffee, tea, tea house', 'carmen:distance': 0.20888191032358838, 'carmen:score': 3, 'carmen:zoom': 14 } },
            { id: 5, properties: { 'carmen:text': 'Mission\'s Kitchen,fast food', 'carmen:distance': 0.1618230166173522, 'carmen:score': 1, 'carmen:zoom': 14 } },
            { id: 9, properties: { 'carmen:text': 'Mission Gastroclub', 'carmen:distance': 0.3514533005726089, 'carmen:score': 0, 'carmen:zoom': 14 } },
            { id: 11, properties: { 'carmen:text': 'Mission Skateboards', 'carmen:distance': 0.4633504101693179, 'carmen:score': 0, 'carmen:zoom': 14 } },
            { id: 6, properties: { 'carmen:text': 'Mission Cultural Center for Latino Arts,college, university', 'carmen:distance': 0.18621060494099984, 'carmen:score': 1, 'carmen:zoom': 14 } },
            { id: 8, properties: { 'carmen:text': 'Mission Critter', 'carmen:distance': 0.24892887064676822, 'carmen:score': 0, 'carmen:zoom': 14 } },
            { id: 4, properties: { 'carmen:text': 'Mission Wishing Tree', 'carmen:distance': 0.10633212084221495, 'carmen:score': 0, 'carmen:zoom': 14 } },
            { id: 1, properties: { 'carmen:text': 'Mississippi', 'carmen:distance': 1873.3273481255542, 'carmen:score': 17955, 'carmen:zoom': 8 } },
            { id: 17, properties: { 'carmen:text': 'Mission Bay Mobile Home Park', 'carmen:distance': 15.112097493445267, 'carmen:score': 0, 'carmen:zoom': 12 } },
            { id: 18, properties: { 'carmen:text': 'Mission-Foothill', 'carmen:distance': 19.97574371302543, 'carmen:score': 44, 'carmen:zoom': 12 } },
            { id: 16, properties: { 'carmen:text': 'Mission Workshop,bicycle, bike, cycle', 'carmen:distance': 0.821663496329208, 'carmen:score': 1, 'carmen:zoom': 14 } },
            { id: 13, properties: { 'carmen:text': 'Mission Pet Hospital', 'carmen:distance': 0.6281933184839765, 'carmen:score': 0, 'carmen:zoom': 14 } },
        ];
        calculteScoreDist(input);
        input.sort(compareScoreDist);

        for (let i = 0; i < input.length; i++) {
            const feat = input[i];
            t.equal(feat.id, i + 1, `index ${i} | id ${feat.id} | ${feat.properties['carmen:scoredist']} | ${feat.properties['carmen:text']}`);
        }
        t.end();
    });
    t.end();
});

test('zoom weighting', (t) => {
    const score = 1000;
    const distance = 30; // miles
    const input = [
        { properties: { 'carmen:distance': distance, 'carmen:zoom': 14, 'carmen:score': score } },
        { properties: { 'carmen:distance': distance, 'carmen:zoom': 12, 'carmen:score': score } },
        { properties: { 'carmen:distance': distance, 'carmen:zoom': 10, 'carmen:score': score } },
        { properties: { 'carmen:distance': distance, 'carmen:zoom': 8, 'carmen:score': score } },
        { properties: { 'carmen:distance': distance, 'carmen:zoom': 6, 'carmen:score': score } }
    ];

    calculteScoreDist(input);
    t.deepEqual(input.sort(compareScoreDist).map((f) => f.properties['carmen:zoom']), [6,8,10,12,14], 'features with lower zoom levels have higher scoredist values');
    t.end();
});
