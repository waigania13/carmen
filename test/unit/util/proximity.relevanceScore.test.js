/* eslint-disable require-jsdoc */
'use strict';
const test = require('tape');
const proximity = require('../../../lib/util/proximity');

function compareRelevanceScore(a, b) {
    return b.properties['carmen:relevance'] - a.properties['carmen:relevance'];
}

function calculateRelevanceScore(input) {
    for (let k = 0; k < input.length; k++) {
        const feat = input[k];
        feat.properties['carmen:relevance'] = proximity.relevanceScore(
            feat.properties['carmen:spatialmatch'].relev,
            feat.properties['carmen:scoredist'],
            feat.properties['carmen:address'],
            feat.properties['carmen:score'] < 0
        );
    }
}

test('calculate relevanceScore', (t) => {
    const minRelev = 0;
    const maxRelev = 1;
    const minScoredist = 1;
    const maxScoredist = 5000;
    t.equal(proximity.relevanceScore(minRelev, minScoredist), 0, 'min relevanceScore value is 0');
    t.equal(proximity.relevanceScore(maxRelev, maxScoredist), 1, 'max relevanceScore value is 1');
    t.ok(proximity.relevanceScore(maxRelev, minScoredist, null) < proximity.relevanceScore(maxRelev, maxScoredist), 'features with carmen:address of null receive a lower relevanceScore');
    t.ok(proximity.relevanceScore(maxRelev, minScoredist, 123, true) < proximity.relevanceScore(maxRelev, maxScoredist, 123, false), 'ghost features receive a lower relevanceScore');
    t.equal(proximity.relevanceScore(minRelev, minScoredist, null), 0, 'min relevanceScore with carmen:address of null is 0');
    t.equal(proximity.relevanceScore(minRelev, minScoredist, 123, true), 0, 'min relevanceScore with ghost feature is 0');
    t.end();
});


test('sort features based on relevanceScore', (t) => {

    t.test('address = null, waupaca near madison, wisconsin', (t) => {
        const input = [
            { id: 2, properties: { 'carmen:text': 'Waupaca Court', 'carmen:spatialmatch': { relev: 1 }, 'carmen:scoredist': 10.976215, 'carmen:address': null } },
            { id: 1, properties: { 'carmen:text': 'Waupaca', 'carmen:spatialmatch': { relev: 1 }, 'carmen:scoredist': 10.788564 } },
            { id: 8, properties: { 'carmen:text': 'Waupaca Street', 'carmen:spatialmatch': { relev: 1 }, 'carmen:scoredist': 5.954101, 'carmen:address': null } },
            { id: 3, properties: { 'carmen:text': 'Waupaca High School,primary school, secondary', 'carmen:spatialmatch': { relev: 1 }, 'carmen:scoredist': 4.869482 } },
            { id: 4, properties: { 'carmen:text': 'Waupaca Camping Park, LLC', 'carmen:spatialmatch': { relev: 1 }, 'carmen:scoredist': 4.826643 } },
            { id: 5, properties: { 'carmen:text': 'Waupaca County Fairgrounds', 'carmen:spatialmatch': { relev: 1 }, 'carmen:scoredist': 4.810530 } },
            { id: 6, properties: { 'carmen:text': 'Waupaca Bowl', 'carmen:spatialmatch': { relev: 1 }, 'carmen:scoredist': 4.802046 } },
            { id: 7, properties: { 'carmen:text': 'Waupaca Ale House', 'carmen:spatialmatch': { relev: 1 }, 'carmen:scoredist': 4.794998 } }
        ];
        calculateRelevanceScore(input);
        input.sort(compareRelevanceScore);
        t.deepEqual(input.map((f) => { return f.id; }), [1,2,3,4,5,6,7,8]);
        t.end();
    });

    t.test('ghost features, sunset district near san francisco', (t) => {
        const input = [
            { id: 2, properties: { 'carmen:text': 'Sunset District','carmen:spatialmatch': { relev: 1 }, 'carmen:distance': 4,'carmen:score': -1,'carmen:scoredist': 10.980303 } },
            { id: 1, properties: { 'carmen:text': 'Sunset City','carmen:spatialmatch': { relev: 1 }, 'carmen:distance': 4,'carmen:score': 10,'carmen:scoredist': 11.000193 } },
            { id: 3, properties: { 'carmen:text': 'DTOWN PARTY BUS','carmen:spatialmatch': { relev: 0.99 }, 'carmen:distance': 451,'carmen:score': 0, 'carmen:scoredist': 1.000006 } },
            { id: 4, properties: { 'carmen:text': 'District Resource Placement Centre','carmen:spatialmatch': { relev: 0.99 }, 'carmen:distance': 790,'carmen:score': 0, 'carmen:scoredist': 1.000006 } },
            { id: 5, properties: { 'carmen:text': 'District Building','carmen:spatialmatch': { relev: 0.99 }, 'carmen:distance': 794,'carmen:score': 0, 'carmen:scoredist': 1.000006 } }
        ];

        calculateRelevanceScore(input);
        input.sort(compareRelevanceScore);
        t.deepEqual(input.map((f) => { return f.id; }), [1,2,3,4,5]);
        t.end();
    });
});
