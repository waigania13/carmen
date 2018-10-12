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

function calculteScoreDist(input, meanScore) {
    input.forEach((feat) => {
        feat.properties['carmen:scoredist'] = Math.max(
            feat.properties['carmen:score'],
            proximity.scoredist(meanScore, feat.properties.distance, feat.properties.zoom, constants.PROXIMITY_RADIUS)
        );
    });
}

test('scoredist', (t) => {

    t.test('new york near san francisco', (t) => {
        // --query="new york" --proximity="-122.4234,37.7715"
        const input = [
            { properties: { text: 'New York,NY,NYC,New York City', distance: 2567.3550038898834, 'carmen:score': 31104, zoom: ZOOM_LEVELS.place } },
            { properties: { text: 'New Yorker Buffalo Wings', distance: 0.6450163846417221, 'carmen:score': 3, zoom: ZOOM_LEVELS.poi } },
            { properties: { text: 'New York Frankfurter Co.', distance: 0.4914344651849769, 'carmen:score': 1, zoom: ZOOM_LEVELS.poi } },
            { properties: { text: 'New York,NY', distance: 2426.866703400975, 'carmen:score': 79161, zoom: ZOOM_LEVELS.region } }
        ];

        const expected = [
            { properties: { text: 'New York Frankfurter Co.', distance: 0.4914344651849769, 'carmen:score': 1, zoom: ZOOM_LEVELS.poi, 'carmen:scoredist': 87517.8314 } },
            { properties: { text: 'New Yorker Buffalo Wings', distance: 0.6450163846417221, 'carmen:score': 3, zoom: ZOOM_LEVELS.poi, 'carmen:scoredist': 87383.1406 } },
            { properties: { text: 'New York,NY', distance: 2426.866703400975, 'carmen:score': 79161, zoom: ZOOM_LEVELS.region, 'carmen:scoredist': 79161 } },
            { properties: { text: 'New York,NY,NYC,New York City', distance: 2567.3550038898834, 'carmen:score': 31104, zoom: ZOOM_LEVELS.place, 'carmen:scoredist': 31104 } }
        ];

        calculteScoreDist(input, proximity.meanScore(input));
        t.deepEqual(input.sort(compareScoreDist), expected);
        t.end();
    });

    t.test('chicago near san francisco', (t) => {
        // --query="chicago" --proximity="-122.4234,37.7715"
        const input = [
            { properties: { text: 'Chicago', distance: 1855.8900334142313, 'carmen:score': 16988, zoom: ZOOM_LEVELS.place } },
            { properties: { text: 'Chicago Title', distance: 0.14084037845690478, 'carmen:score': 2, zoom: ZOOM_LEVELS.poi } }
        ];

        const expected = [
            { properties: { text: 'Chicago Title', distance: 0.14084037845690478, 'carmen:score': 2, zoom: ZOOM_LEVELS.poi, 'carmen:scoredist': 55219.8854 } },
            { properties: { text: 'Chicago', distance: 1855.8900334142313, 'carmen:score': 16988, zoom: ZOOM_LEVELS.place, 'carmen:scoredist': 16988 } }
        ];

        calculteScoreDist(input, proximity.meanScore(input));
        t.deepEqual(input.sort(compareScoreDist), expected);
        t.end();
    });

    t.test('san near north sonoma county', (t) => {
        // --query="san" --proximity="-123.0167,38.7471"
        const input = [
            { properties: { text: 'Santa Cruz', distance: 133.8263938095184, 'carmen:score': 587, zoom: ZOOM_LEVELS.place } },
            { properties: { text: 'São Paulo', distance: 6547.831697209755, 'carmen:score': 36433, zoom: ZOOM_LEVELS.place } },
            { properties: { text: 'Santiago Metropolitan,METROPOLITANA,Región Metropolitana de Santiago', distance: 6023.053777668511, 'carmen:score': 26709, zoom: ZOOM_LEVELS.place } },
            { properties: { text: 'San Francisco', distance: 74.24466022598429, 'carmen:score': 8015, zoom: ZOOM_LEVELS.place } }
        ];

        const expected = [
            { properties: { text: 'San Francisco', distance: 74.24466022598429, 'carmen:score': 8015, zoom: ZOOM_LEVELS.place, 'carmen:scoredist': 1894783.9001 } },
            { properties: { text: 'Santa Cruz', distance: 133.8263938095184, 'carmen:score': 587, zoom: ZOOM_LEVELS.place, 'carmen:scoredist': 1489661.7393 } },
            { properties: { text: 'São Paulo', distance: 6547.831697209755, 'carmen:score': 36433, zoom: ZOOM_LEVELS.place, 'carmen:scoredist': 36433 } },
            { properties: { text: 'Santiago Metropolitan,METROPOLITANA,Región Metropolitana de Santiago', distance: 6023.053777668511, 'carmen:score': 26709, zoom: ZOOM_LEVELS.place, 'carmen:scoredist': 26709 } }
        ];

        calculteScoreDist(input, proximity.meanScore(input));
        t.deepEqual(input.sort(compareScoreDist), expected);
        t.end();
    });

    t.test('santa cruz near sonoma county', (t) => {
        // --query="santa cruz" --proximity="-123.0167,38.7471"
        const input = [
            { properties: { text: 'Santa Cruz', distance: 133.8263938095184, 'carmen:score': 587, zoom: ZOOM_LEVELS.place } },
            { properties: { text: 'Santa Cruz de Tenerife', distance: 5811.283048403849, 'carmen:score': 3456, zoom: ZOOM_LEVELS.place } }
        ];

        const expected = [
            { properties: { text: 'Santa Cruz', distance: 133.8263938095184, 'carmen:score': 587, zoom: ZOOM_LEVELS.place, 'carmen:scoredist': 257940.7947 } },
            { properties: { text: 'Santa Cruz de Tenerife', distance: 5811.283048403849, 'carmen:score': 3456, zoom: ZOOM_LEVELS.place, 'carmen:scoredist': 3456 } }
        ];
        calculteScoreDist(input, proximity.meanScore(input));
        t.deepEqual(input.sort(compareScoreDist), expected);
        t.end();
    });

    t.test('washington near baltimore', (t) => {
        // --query="washington" --proximity="-76.6035,39.3008"
        const input = [
            { properties: { text: 'Washington,DC', distance: 34.81595024835296, 'carmen:score': 7400, zoom: ZOOM_LEVELS.place } },
            { properties: { text: 'Washington,WA', distance: 2256.6130314083157, 'carmen:score': 33373, zoom: ZOOM_LEVELS.region } }
        ];

        const expected = [
            { properties: { text: 'Washington,DC', distance: 34.81595024835296, 'carmen:score': 7400, zoom: ZOOM_LEVELS.place, 'carmen:scoredist': 4183232.7802 } },
            { properties: { text: 'Washington,WA', distance: 2256.6130314083157, 'carmen:score': 33373, zoom: ZOOM_LEVELS.region, 'carmen:scoredist': 33373 } }
        ];
        calculteScoreDist(input, proximity.meanScore(input));
        t.deepEqual(input.sort(compareScoreDist), expected);
        t.end();
    });

    t.test('gilmour ave near guelph, on, canada', (t) => {
        // --query="gilmour ave" --proximity="-80.1617,43.4963"
        const input = [
            { properties: { text: 'Gilmour Ave, Runnymede, Toronto, M6P 3B5, Ontario, Canada, CA', distance: 36.12228253928214, 'carmen:score': 0, zoom: ZOOM_LEVELS.address } },
            { properties: { text: 'Gilmour Ave, Hillendale, Kingston, K7M 2Y8, Ontario, Canada, CA', distance: 188.29482550861198, 'carmen:score': 0, zoom: ZOOM_LEVELS.address } },
            { properties: { text: 'Gilmour Ave, Somerset, 15501, Pennsylvania, United States', distance: 246.29759329605977, 'carmen:score': 0, zoom: ZOOM_LEVELS.address } },
            { properties: { text: 'Gilmour Avenue, West Dunbartonshire, G81 6AN, West Dunbartonshire, United Kingdom', distance: 3312.294287119006, 'carmen:score': 3, zoom: ZOOM_LEVELS.address } }
        ];

        const expected = [
            { properties: { text: 'Gilmour Ave, Runnymede, Toronto, M6P 3B5, Ontario, Canada, CA', distance: 36.12228253928214, 'carmen:score': 0, zoom: ZOOM_LEVELS.address, 'carmen:scoredist': 265.0827 } },
            { properties: { text: 'Gilmour Avenue, West Dunbartonshire, G81 6AN, West Dunbartonshire, United Kingdom', distance: 3312.294287119006, 'carmen:score': 3, zoom: ZOOM_LEVELS.address, 'carmen:scoredist': 3 } },
            { properties: { text: 'Gilmour Ave, Hillendale, Kingston, K7M 2Y8, Ontario, Canada, CA', distance: 188.29482550861198, 'carmen:score': 0, zoom: ZOOM_LEVELS.address, 'carmen:scoredist': 1.3524 } },
            { properties: { text: 'Gilmour Ave, Somerset, 15501, Pennsylvania, United States', distance: 246.29759329605977, 'carmen:score': 0, zoom: ZOOM_LEVELS.address, 'carmen:scoredist': 0 } }
        ];
        calculteScoreDist(input, proximity.meanScore(input));
        t.deepEqual(input.sort(compareScoreDist), expected);
        t.end();
    });

    t.test('cambridge near guelph, on, canada', (t) => {
        // --query="cambridge" --proximity="-80.1617,43.4963"
        const input = [
            { properties: { text: 'Cambridge, N1R 6A9, Ontario, Canada, CA', distance: 10.73122383596493, 'carmen:score': 294, zoom: ZOOM_LEVELS.place } },
            { properties: { text: 'Cambridge, 02139, Massachusetts, United States', distance: 464.50390088754625, 'carmen:score': 986, zoom: ZOOM_LEVELS.place } },
            { properties: { text: 'Cambridgeshire, United Kingdom', distance: 3566.2969841802374, 'carmen:score': 2721, zoom: ZOOM_LEVELS.district } }
        ];

        const expected = [
            { properties: { text: 'Cambridge, N1R 6A9, Ontario, Canada, CA', distance: 10.73122383596493, 'carmen:score': 294, zoom: ZOOM_LEVELS.place, 'carmen:scoredist': 267360.0674 } },
            { properties: { text: 'Cambridge, 02139, Massachusetts, United States', distance: 464.50390088754625, 'carmen:score': 986, zoom: ZOOM_LEVELS.place, 'carmen:scoredist': 14135.8936 } },
            { properties: { text: 'Cambridgeshire, United Kingdom', distance: 3566.2969841802374, 'carmen:score': 2721, zoom: ZOOM_LEVELS.district, 'carmen:scoredist': 2721 } }
        ];
        calculteScoreDist(input, proximity.meanScore(input));
        t.deepEqual(input.sort(compareScoreDist), expected);
        t.end();
    });

    t.test('united states near washington dc', (t) => {
        // --query="United States" --proximity="-77.03361679999999,38.900039899999996"
        const input = [
            { properties: { text: 'United States of America, United States, America, USA, US', distance: 1117.3906777683906, 'carmen:score': 1634443, zoom: ZOOM_LEVELS.country } },
            { properties: { text: 'United States Department of Treasury Annex', distance: 0.11774815645353183, 'carmen:score': 0, zoom: ZOOM_LEVELS.poi } },
        ];

        const expected = [
            { properties: { text: 'United States of America, United States, America, USA, US', distance: 1117.3906777683906, 'carmen:score': 1634443, zoom: ZOOM_LEVELS.country, 'carmen:scoredist': 1634443 } },
            { properties: { text: 'United States Department of Treasury Annex', distance: 0.11774815645353183, 'carmen:score': 0, zoom: ZOOM_LEVELS.poi, 'carmen:scoredist': 383084.5351 } }
        ];
        calculteScoreDist(input, proximity.meanScore(input));
        t.deepEqual(input.sort(compareScoreDist), expected);
        t.end();
    });
    t.end();
});

test('zoom weighting', (t) => {
    const score = 1000;
    const distance = 30; // miles
    const input = [
        { properties: { distance: distance, zoom: 14, 'carmen:score': score } },
        { properties: { distance: distance, zoom: 12, 'carmen:score': score } },
        { properties: { distance: distance, zoom: 10, 'carmen:score': score } },
        { properties: { distance: distance, zoom: 8, 'carmen:score': score } },
        { properties: { distance: distance, zoom: 6, 'carmen:score': score } }
    ];

    calculteScoreDist(input, proximity.meanScore(input));
    t.deepEqual(input.sort(compareScoreDist).map((f) => f.properties.zoom), [6,8,10,12,14], 'features with lower zoom levels have higher scoredist values');
    t.end();
});
