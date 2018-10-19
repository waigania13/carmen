'use strict';
const test = require('tape');
const constants = require('../../../lib/constants');
const proximity = require('../../../lib/util/proximity');
const cTable = require('console.table');

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

function calculateScoreDist(input, maxScore) {
    for (let k = 0; k < input.length; k++) {
        const feat = input[k];
        // ghost features don't participate
        if (feat.properties['carmen:score'] >= 0) {
            feat.properties['carmen:scoredist'] = proximity.scoredist(feat.properties['carmen:score'], feat.properties['carmen:distance'], feat.properties['carmen:zoom'], constants.PROXIMITY_RADIUS);
            console.log('typeof scoredist', typeof feat.properties['carmen:scoredist']);
        } else {
            feat.properties['carmen:scoredist'] = feat.properties['carmen:score'];
        }
    }
}

test('scoredist', (t) => {

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

        calculateScoreDist(input);
        input.sort(compareScoreDist);
        const stats = [];

        for (let i = 0; i < input.length; i++) {
            const feat = input[i];
            const st = {
                index: `${i + 1}.`,
                name: feat.properties['carmen:text'],
                dist: parseFloat(feat.properties['carmen:distance']).toFixed(4),
                distVal: proximity.distRelevance(feat.properties['carmen:distance'], feat.properties['carmen:zoom'], constants.PROXIMITY_RADIUS),
                score: feat.properties['carmen:score'],
                scoreVal: proximity.scoreRelevance(feat.properties['carmen:score']),
                scoredist: feat.properties['carmen:scoredist']
            };
            stats.push(st);
        }
        console.table(stats);
        t.end();
    });
    t.end();
});
