'use strict';
const token = require('../../../lib/text-processing/token');
const test = require('tape');

test('categorizeTokenReplacements', (t) => {
    t.deepEqual(
        token.categorizeTokenReplacements({
            'Street': 'St',
            'lane': 'ln',
            'Piazza': 'P.zza',
            'three': '3',
            '(.+)väg': { text: '$1v', regex: true },
            'dix-huitième': { text: '18e', spanBoundaries: 1 },
            '([^ ]+)(strasse|str|straße)': { text: '$1 str', regex: true, skipDiacriticStripping: true, spanBoundaries: 0 },
            'Résidence': 'Res',
            'San': 'S.',
            'Strada Provinciale': { text: 'SP', spanBoundaries: 1 },
            'Strada Statale': 'SS',
            'P\\.? O\\.? Box [0-9]+': { text: '', spanBoundaries: 2, regex: true },
            'Zone d\'activité': 'Za',
            'N.T.': 'NT' // Will be dropped b/c it makes no changes
        }),
        {
            simple: [
                { from: 'street', to: 'st' },
                { from: 'lane', to: 'ln' },
                { from: 'piazza', to: 'pzza' },
                { from: 'three', to: '3' },
                { from: 'residence', to: 'res' },
                { from: 'san', to: 's' }
            ],
            complex: [
                { from: '(.+)väg', to: { text: '$1v', regex: true } },
                { from: 'dix-huitième', to: { text: '18e', spanBoundaries: 1 } },
                { from: '([^ ]+)(strasse|str|straße)', to: { text: '$1 str', regex: true, skipDiacriticStripping: true, spanBoundaries: 0 } },
                { from: 'Strada Provinciale', to: { text: 'SP', spanBoundaries: 1 } },
                { from: 'Strada Statale', to: 'SS' },
                { from: 'P\\.? O\\.? Box [0-9]+', to: { text: '', spanBoundaries: 2, regex: true } },
                { from: 'Zone d\'activité', to: 'Za' }
            ]
        }
    );
    t.end();
});
