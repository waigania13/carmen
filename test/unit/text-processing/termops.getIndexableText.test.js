'use strict';
const termops = require('../../../lib/text-processing/termops');
const token = require('../../../lib/text-processing/token');
const test = require('tape');

test('termops.getIndexableText', (t) => {
    let replacer;
    let doc;
    let texts;

    replacer = token.createReplacer({});
    doc = { properties: { 'carmen:text': 'Main Street' } };
    texts = [
        { languages: ['default'], tokens: ['main', 'street'] }
    ];
    t.deepEqual(termops.getIndexableText(replacer, [], doc), texts, 'creates indexableText');

    replacer = token.createReplacer({ 'Street':'St' });
    doc = { properties: { 'carmen:text': 'Main Street' } };
    texts = [
        { languages: ['default'], tokens: ['main', 'st'] },
        { languages: ['default'], tokens: ['main', 'street'] }
    ];
    t.deepEqual(termops.getIndexableText(replacer, [], doc), texts, 'creates contracted phrases using geocoder_tokens');

    replacer = token.createReplacer({ 'Street':'St' });
    doc = { properties: { 'carmen:text': 'Main Street, main st' } };
    texts = [
        { languages: ['default'], tokens: ['main', 'st'] },
        { languages: ['default'], tokens: ['main', 'street'] }
    ];
    t.deepEqual(termops.getIndexableText(replacer, [], doc), texts, 'include variants');

    replacer = token.createReplacer({ 'Street':'St', 'Lane':'Ln' }, { includeUnambiguous: true });

    doc = { properties: { 'carmen:text': 'Main Street Lane' } };
    texts = [
        { languages: ['default'], tokens: ['main', 'st', 'ln'] },
        { languages: ['default'], tokens: ['main', 'st', 'lane'] },
        { languages: ['default'], tokens: ['main', 'street', 'ln'] },
        { languages: ['default'], tokens: ['main', 'street', 'lane'] }
    ];
    t.deepEqual(termops.getIndexableText(replacer, [], doc), texts, 'include variants 2');

    doc = { properties: { 'carmen:text': 'Main Street St Lane Ln' } };
    t.assert(termops.getIndexableText(replacer, [], doc).length <= 8, 'only include 8 permutations');

    replacer = token.createReplacer({ 'Saint': 'St', 'Street':'St', 'Lane':'Ln' }, { includeUnambiguous: true });

    doc = { properties: { 'carmen:text': 'Main Street St Lane' } };
    texts = [
        { languages: ['default'], tokens: ['main', 'st', 'st', 'ln'] },
        { languages: ['default'], tokens: ['main', 'st', 'st', 'lane'] },
        { languages: ['default'], tokens: ['main', 'street', 'st', 'ln'] },
        { languages: ['default'], tokens: ['main', 'street', 'st', 'lane'] }
    ];
    t.deepEqual(termops.getIndexableText(replacer, [], doc), texts, 'don\'t expand st if it\'s ambiguous');

    replacer = token.createReplacer({ 'Saint': 'St', 'Street':'St', 'Lane':'Ln' }, {
        includeUnambiguous: true,
        custom: {
            'St': function() {
                const full = arguments[arguments.length - 1];
                const offset = arguments[arguments.length - 2];
                const match = arguments[0];
                const pre = full.slice(0, offset);
                const post = full.slice(offset + match.length);

                let out;
                if (pre.trim() === '') out = arguments[1] + 'saint' + arguments[2];
                else if (post.trim() === '') out = arguments[1] + 'street' + arguments[2];
                else out = arguments[0];

                return out;
            }
        }
    });

    doc = { properties: { 'carmen:text': 'st thomas st' } };
    texts = [
        { languages: ['default'], tokens: ['st', 'thomas', 'st'] },
        { languages: ['default'], tokens: ['saint', 'thomas', 'st'] },
        { languages: ['default'], tokens: ['saint', 'thomas', 'street'] },
        { languages: ['default'], tokens: ['st', 'thomas', 'street'] }
    ];
    t.deepEqual(termops.getIndexableText(replacer, [], doc), texts, 'include st if there\'s a custom reverse function');

    replacer = token.createReplacer({ 'Saint': 'St', 'Street':'St', 'Lane':'Ln' }, {
        includeUnambiguous: true,
        custom: {
            'ä': { skipBoundaries: true, skipDiacriticStripping: true, text: 'ae' },
            'ö': { skipBoundaries: true, skipDiacriticStripping: true, text: 'oe' },
            'ü': { skipBoundaries: true, skipDiacriticStripping: true, text: 'ue' },
        }
    });
    doc = { properties: { 'carmen:text': 'Äpfelstrüdeln Strasse' } };
    texts = [
        { languages: ['default'], tokens: ['äpfelstrüdeln', 'strasse'] },
        { languages: ['default'], tokens: ['äpfelstruedeln', 'strasse'] },
        { languages: ['default'], tokens: ['aepfelstrüdeln', 'strasse'] },
        { languages: ['default'], tokens: ['aepfelstruedeln', 'strasse'] }
    ];
    t.deepEqual(termops.getIndexableText(replacer, [], doc), texts, 'support custom reverse functions that can skip word boundaries');


    replacer = token.createReplacer({ 'dix-huitième':'18e' });
    doc = { properties: { 'carmen:text': 'Avenue du dix-huitième régiment' } };
    texts = [
        { languages: ['default'], tokens: ['avenue', 'du', '18e', 'régiment'] },
        { languages: ['default'], tokens: ['avenue', 'du', 'dix', 'huitième', 'régiment'] }
    ];
    t.deepEqual(termops.getIndexableText(replacer, [], doc), texts, 'hypenated replacement');

    replacer = token.createReplacer({});
    doc = {
        properties: {
            'carmen:text':'Main Street',
            'carmen:addressnumber': [[1, 10, 100, 200]]
        }
    };
    texts = [
        { languages: ['default'], tokens: ['main', 'street'] },
        { languages: ['default'], tokens: ['2##', 'main', 'street'] },
        { languages: ['default'], tokens: ['1##', 'main', 'street'] },
        { languages: ['default'], tokens: ['##', 'main', 'street'] },
        { languages: ['default'], tokens: ['#', 'main', 'street'] }
    ];
    t.deepEqual(termops.getIndexableText(replacer, [],  doc), texts, 'with range');

    replacer = token.createReplacer({ 'street': 'st' });
    doc = {
        properties: {
            'carmen:text':'Main Street',
            'carmen:addressnumber': [[1, 10, 100, 200]]
        }
    };
    texts = [
        { tokens: ['main', 'st'],            languages: ['default'] },
        { tokens: ['2##', 'main', 'st'],     languages: ['default'] },
        { tokens: ['1##', 'main', 'st'],     languages: ['default'] },
        { tokens: ['##', 'main', 'st'],      languages: ['default'] },
        { tokens: ['#', 'main', 'st'],       languages: ['default'] },
        { tokens: ['main', 'street'],        languages: ['default'] },
        { tokens: ['2##', 'main', 'street'], languages: ['default'] },
        { tokens: ['1##', 'main', 'street'], languages: ['default'] },
        { tokens: ['##', 'main', 'street'],  languages: ['default'] },
        { tokens: ['#', 'main', 'street'],   languages: ['default'] }
    ];
    t.deepEqual(termops.getIndexableText(replacer, [],  doc), texts, 'with range');

    // test for when token replacement creates 8 variants
    replacer = token.createReplacer({ 'street': 'st', 'road': 'rd', 'north': 'n' });
    doc = {
        properties: {
            'carmen:text':'North Newtown Street Road',
        }
    };
    texts = [
        { tokens: ['n', 'newtown', 'st', 'rd'], languages: ['default'] },
        { tokens: ['north', 'newtown', 'st', 'rd'], languages: ['default'] },
        { tokens: ['n', 'newtown', 'st', 'road'], languages: ['default'] },
        { tokens: ['north', 'newtown', 'st', 'road'], languages: ['default'] },
        { tokens: ['n', 'newtown', 'street', 'rd'], languages: ['default'] },
        { tokens: ['north', 'newtown', 'street', 'rd'], languages: ['default'] },
        { tokens: ['n', 'newtown', 'street', 'road'], languages: ['default'] },
        { tokens: ['north', 'newtown', 'street', 'road'], languages: ['default'] }
    ];
    t.deepEqual(termops.getIndexableText(replacer, [],  doc), texts, '8 variants');

    // test for when token replacement creates more than 8 variants (and gets truncated to 8)
    replacer = token.createReplacer({ 'street': 'st', 'road': 'rd', 'north': 'n', 'square': 'sq' });
    doc = {
        properties: {
            'carmen:text':'North Newtown Square Street Road',
        }
    };
    // it happens that none of the variants with "street" will be found, since
    // those happen to be the final 8 combinations
    texts = [
        { tokens: ['n', 'newtown', 'sq', 'st', 'rd'], languages: ['default'] },
        { tokens: ['n', 'newtown', 'square', 'st', 'rd'], languages: ['default'] },
        { tokens: ['north', 'newtown', 'sq', 'st', 'rd'], languages: ['default'] },
        { tokens: ['north', 'newtown', 'square', 'st', 'rd'], languages: ['default'] },
        { tokens: ['n', 'newtown', 'sq', 'st', 'road'], languages: ['default'] },
        { tokens: ['n', 'newtown', 'square', 'st', 'road'], languages: ['default'] },
        { tokens: ['north', 'newtown', 'sq', 'st', 'road'], languages: ['default'] },
        { tokens: ['north', 'newtown', 'square', 'st', 'road'], languages: ['default'] }
    ];
    t.deepEqual(termops.getIndexableText(replacer, [],  doc), texts, 'more than 8 variants');

    replacer = token.createReplacer({});
    doc = { properties: { 'carmen:text': 'Main Street', 'carmen:text_es': 'El Main Street' } };
    texts = [
        { languages: ['default'], tokens: ['main', 'street'] },
        { languages: ['es'], tokens: ['el', 'main', 'street'] }
    ];
    t.deepEqual(termops.getIndexableText(replacer, [], doc, true), texts, 'in the presence of translations, plain carmen:text has language "default" and translations are language-specific');

    replacer = token.createReplacer({});
    doc = { properties: { 'carmen:text': 'San Francisco Airport', 'carmen:text_universal': 'SFO' } };
    texts = [
        { languages: ['default'], tokens: ['san', 'francisco', 'airport'] },
        { languages: ['all'], tokens: ['sfo'] }
    ];
    t.deepEqual(termops.getIndexableText(replacer, [], doc), texts, 'in the presence of universal text, plain carmen:text and text_universal both have language "all"');

    replacer = token.createReplacer({});
    doc = { properties: { 'carmen:text': 'San Francisco Airport', 'carmen:text_universal': 'SFO', 'carmen:text_es': 'Aeropuerto de San Francisco' } };
    texts = [
        { languages: ['default'], tokens: ['san', 'francisco', 'airport'] },
        { languages: ['all'], tokens: ['sfo'] },
        { languages: ['es'], tokens: ['aeropuerto', 'de', 'san', 'francisco'] }
    ];
    t.deepEqual(termops.getIndexableText(replacer, [], doc, true), texts, 'universal text is always indexed across langauges');
    replacer = token.createReplacer({});
    doc = { properties: { 'carmen:text': 'Latveria,Republic of Latveria' } };
    texts = [
        { languages: ['default'], tokens: ['latveria'] },
        { languages: ['default'], tokens: ['republic', 'of', 'latveria'] }
    ];
    t.deepEqual(termops.getIndexableText(replacer, [], doc), texts, 'creates indexableText w/ synonyms');

    replacer = token.createReplacer({});
    doc = { properties: { 'carmen:text': 'New York', 'carmen:text_es': 'Nueva York', 'carmen:text_en': 'New York' } };
    texts = [
        { languages: ['default', 'en'], tokens: ['new', 'york'] },
        { languages: ['es'], tokens: ['nueva', 'york'] }
    ];
    t.deepEqual(termops.getIndexableText(replacer, [], doc, true), texts, 'translations with phrase overlaps are properly grouped');

    replacer = token.createReplacer({});
    doc = { properties: { 'carmen:text': 'United States', 'carmen:text_sv': 'USA', 'carmen:text_universal': 'USA' } };
    texts = [
        { languages: ['default'], tokens: ['united', 'states'] },
        { languages: ['sv', 'all'], tokens: ['usa'] }
    ];
    t.deepEqual(termops.getIndexableText(replacer, [], doc, true), texts, 'universal text');

    t.end();
});

test('replacer/globalReplacer interaction', (t) => {
    const replacer = token.createReplacer({
        'ä': { skipBoundaries: true, skipDiacriticStripping: true, text: 'ae' },
        'ö': { skipBoundaries: true, skipDiacriticStripping: true, text: 'oe' },
        'ü': { skipBoundaries: true, skipDiacriticStripping: true, text: 'ue' }
    }, { includeUnambiguous: true });
    const globalReplacer = token.createGlobalReplacer({
        '(?:[\s\u2000-\u206F\u2E00-\u2E7F\\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]|^)(.+)(strasse|str|straße)(?:[\s\u2000-\u206F\u2E00-\u2E7F\\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]|$)': ' $1 str '
    });

    const withUmlaut = termops.getIndexableText(replacer, globalReplacer, { properties: { 'carmen:text': 'Phönixstraße' } });
    const withOe = termops.getIndexableText(replacer, globalReplacer, { properties: { 'carmen:text': 'Phoenixstraße' } });

    t.deepEqual(withUmlaut, withOe, 'umlaut and oe versions get treated the same way');
    t.deepEqual(withUmlaut, [
        { tokens: ['phoenix', 'str'], languages: ['default'] },
        { tokens: ['phönix', 'str'], languages: ['default'] },
        { tokens: ['phoenixstraße'], languages: ['default'] },
        { tokens: ['phönixstraße'], languages: ['default'] }
    ], 'all variants are generated');

    t.end();
});

test('Reserved words for inherited functions', (t) => {
    const replacer = token.createReplacer({});
    const doc = { properties: { 'carmen:text': 'constructor' } };
    const texts = [
        { languages: ['default'], tokens: ['constructor'] }
    ];
    t.deepEqual(termops.getIndexableText(replacer, [], doc), texts, 'creates indexableText');
    t.end();
});
