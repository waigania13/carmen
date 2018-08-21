'use strict';
const test = require('tape');

const ZOOM_LEVELS = {
    address: 14,
    poi: 14,
    place: 12,
    region: 6,
    district: 9
};
const constants = require('../../../lib/constants');
const scoredist = require('../../../lib/util/proximity').scoredist;

function compare(a, b) {
    return scoredist(b.score, b.distance, b.zoom, constants.PROXIMITY_RADIUS) - scoredist(a.score, a.distance, a.zoom, constants.PROXIMITY_RADIUS);
}

test('scoredist', (t) => {

    t.test('new york', (t) => {
        // --query="new york" --proximity="-122.4234,37.7715"
        const input = [
            { text: 'New York,NY', distance: 2426.866703400975, score: 79161, zoom: ZOOM_LEVELS.region },
            { text: 'New York,NY,NYC,New York City', distance: 2567.3550038898834, score: 31104, zoom: ZOOM_LEVELS.place },
            { text: 'New Yorker Buffalo Wings', distance: 0.6450163846417221, score: 3, zoom: ZOOM_LEVELS.poi },
            { text: 'New York Frankfurter Co.', distance: 0.4914344651849769, score: 1, zoom: ZOOM_LEVELS.poi },
        ];
        const expected = [
            { text: 'New Yorker Buffalo Wings', distance: 0.6450163846417221, score: 3, zoom: ZOOM_LEVELS.poi },
            { text: 'New York Frankfurter Co.', distance: 0.4914344651849769, score: 1, zoom: ZOOM_LEVELS.poi },
            { text: 'New York,NY', distance: 2426.866703400975, score: 79161, zoom: ZOOM_LEVELS.region },
            { text: 'New York,NY,NYC,New York City', distance: 2567.3550038898834, score: 31104, zoom: ZOOM_LEVELS.place },
        ];
        t.deepEqual(input.sort(compare), expected);
        t.end();
    });

    t.test('chicago near san francisco', (t) => {
        // --query="chicago" --proximity="-122.4234,37.7715"
        const input = [
            { text: 'Chicago', distance: 1855.8900334142313, score: 16988, zoom: ZOOM_LEVELS.place },
            { text: 'Chicago Title', distance: 0.14084037845690478, score: 2, zoom: ZOOM_LEVELS.poi }
        ];
        const expected = [
            { text: 'Chicago Title', distance: 0.14084037845690478, score: 2, zoom: ZOOM_LEVELS.poi },
            { text: 'Chicago', distance: 1855.8900334142313, score: 16988, zoom: ZOOM_LEVELS.place }
        ];
        t.deepEqual(input.sort(compare), expected);
        t.end();
    });

    t.test('san near north sonoma county', (t) => {
        // --query="san" --proximity="-123.0167,38.7471"
        const input = [
            { text: 'São Paulo', distance: 6547.831697209755, score: 36433, zoom: ZOOM_LEVELS.place },
            { text: 'Santiago Metropolitan,METROPOLITANA,Región Metropolitana de Santiago', distance: 6023.053777668511, score: 26709, zoom: ZOOM_LEVELS.place },
            { text: 'San Francisco', distance: 74.24466022598429, score: 8015, zoom: ZOOM_LEVELS.place },
            { text: 'Santa Cruz', distance: 133.8263938095184, score: 587, zoom: ZOOM_LEVELS.place },
        ];
        const expected = [
            { text: 'San Francisco', distance: 74.24466022598429, score: 8015, zoom: ZOOM_LEVELS.place },
            { text: 'Santa Cruz', distance: 133.8263938095184, score: 587, zoom: ZOOM_LEVELS.place },
            { text: 'São Paulo', distance: 6547.831697209755, score: 36433, zoom: ZOOM_LEVELS.place },
            { text: 'Santiago Metropolitan,METROPOLITANA,Región Metropolitana de Santiago', distance: 6023.053777668511, score: 26709, zoom: ZOOM_LEVELS.place },
        ];
        t.deepEqual(input.sort(compare), expected);
        t.end();
    });

    t.test('santa cruz near sonoma county', (t) => {
        // --query="santa cruz" --proximity="-123.0167,38.7471"
        const input = [
            { text: 'Santa Cruz', distance: 133.8263938095184, score: 587, zoom: ZOOM_LEVELS.place },
            { text: 'Santa Cruz de Tenerife', distance: 5811.283048403849, score: 3456, zoom: ZOOM_LEVELS.place }
        ];
        const expected = [
            { text: 'Santa Cruz', distance: 133.8263938095184, score: 587, zoom: ZOOM_LEVELS.place },
            { text: 'Santa Cruz de Tenerife', distance: 5811.283048403849, score: 3456, zoom: ZOOM_LEVELS.place }
        ];
        t.deepEqual(input.sort(compare), expected);
        t.end();
    });

    t.test('washington near baltimore', (t) => {
        // --query="washington" --proximity="-76.6035,39.3008"
        const input = [
            { text: 'District of Columbia,DC', distance: 34.81595024835296, score: 7429, zoom: ZOOM_LEVELS.place },
            { text: 'Washington,WA', distance: 2256.6130314083157, score: 33373, zoom: ZOOM_LEVELS.region }
        ];
        const expected = [
            { text: 'District of Columbia,DC', distance: 34.81595024835296, score: 7429, zoom: ZOOM_LEVELS.place },
            { text: 'Washington,WA', distance: 2256.6130314083157, score: 33373, zoom: ZOOM_LEVELS.region }
        ];
        t.deepEqual(input.sort(compare), expected);
        t.end();
    });

    t.test('gilmour ave near guelph, on, canada', (t) => {
        // --query="gilmour ave" --proximity="-80.1617,43.4963"
        const input = [
            { text: 'Gilmour Ave, Runnymede, Toronto, M6P 3B5, Ontario, Canada, CA', distance: 36.12228253928214, score: 0, zoom: ZOOM_LEVELS.address },
            { text: 'Gilmour Ave, Hillendale, Kingston, K7M 2Y8, Ontario, Canada, CA', distance: 188.29482550861198, score: 0, zoom: ZOOM_LEVELS.address },
            { text: 'Gilmour Ave, Somerset, 15501, Pennsylvania, United States', distance: 246.29759329605977, score: 0, zoom: ZOOM_LEVELS.address },
            { text: 'Gilmour Avenue, West Dunbartonshire, G81 6AN, West Dunbartonshire, United Kingdom', distance: 3312.294287119006, score: 3, zoom: ZOOM_LEVELS.address },
        ];
        const expected = [
            { text: 'Gilmour Ave, Runnymede, Toronto, M6P 3B5, Ontario, Canada, CA', distance: 36.12228253928214, score: 0, zoom: ZOOM_LEVELS.address },
            { text: 'Gilmour Ave, Hillendale, Kingston, K7M 2Y8, Ontario, Canada, CA', distance: 188.29482550861198, score: 0, zoom: ZOOM_LEVELS.address },
            { text: 'Gilmour Ave, Somerset, 15501, Pennsylvania, United States', distance: 246.29759329605977, score: 0, zoom: ZOOM_LEVELS.address },
            { text: 'Gilmour Avenue, West Dunbartonshire, G81 6AN, West Dunbartonshire, United Kingdom', distance: 3312.294287119006, score: 3, zoom: ZOOM_LEVELS.address },
        ];
        t.deepEqual(input.sort(compare), expected);
        t.end();
    });

    t.test('cambridge near guelph, on, canada', (t) => {
        // --query="cambridge" --proximity="-80.1617,43.4963"
        const input = [
            { text: 'Cambridge, N1R 6A9, Ontario, Canada, CA', distance: 10.73122383596493, score: 294, zoom: ZOOM_LEVELS.place },
            { text: 'Cambridge, 02139, Massachusetts, United States', distance: 464.50390088754625, score: 986, zoom: ZOOM_LEVELS.place },
            { text: 'Cambridgeshire, United Kingdom', distance: 3566.2969841802374, score: 2721, zoom: ZOOM_LEVELS.district },
        ];
        const expected = [
            { text: 'Cambridge, N1R 6A9, Ontario, Canada, CA', distance: 10.73122383596493, score: 294, zoom: ZOOM_LEVELS.place },
            { text: 'Cambridge, 02139, Massachusetts, United States', distance: 464.50390088754625, score: 986, zoom: ZOOM_LEVELS.place },
            { text: 'Cambridgeshire, United Kingdom', distance: 3566.2969841802374, score: 2721, zoom: ZOOM_LEVELS.district },
        ];
        t.deepEqual(input.sort(compare), expected);
        t.end();
    });


    t.end();
});

// The radius of effect extends further at lower zooms
test('zoom weighting', (t) => {
    const score = 1000;
    const distance = 30; // miles

    t.deepEqual(scoredist(score, distance, 6, 40), 84027.7778, 'zoom 6');
    t.deepEqual(scoredist(score, distance, 8, 40), 79719.3878, 'zoom 8');
    t.deepEqual(scoredist(score, distance, 10, 40), 72250, 'zoom 10');
    t.deepEqual(scoredist(score, distance, 12, 40), 56250, 'zoom 12');
    t.deepEqual(scoredist(score, distance, 14, 40), 6250, 'zoom 14');
    t.end();
});
