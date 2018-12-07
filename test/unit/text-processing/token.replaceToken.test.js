'use strict';
const token = require('../../../lib/text-processing/token');
const test = require('tape');

const tokenList = {
    'First': '1st',
    'Second': '2nd',
    'Third': '3rd',
    'Fourth': '4th',
    'Fifth': '5th',
    'Sixth': '6th',
    'Seventh': '7th',
    'Eigth': '8th',
    'Ninth': '9th',
    'Tenth': '10th',
    'Eleventh': '11th',
    'Twelfth': '12th',
    'Thirteenth': '13th',
    'Fourteenth': '14th',
    'Fifteenth': '15th',
    'Sixteenth': '16th',
    'Seventeenth': '17th',
    'Eighteenth': '18th',
    'Nineteenth': '19th',
    'Twentieth': '20th',
    'Alley': 'Aly',
    'Arcade': 'Arc',
    'Avenue': 'Ave',
    'Bayoo': 'Byu',
    'Beach': 'Bch',
    'Bluff': 'Blf',
    'Bottom': 'Btm',
    'Boulevard': 'Blvd',
    'Branch': 'Br',
    'Bridge': 'Brg',
    'Brook': 'Brk',
    'Brooks': 'Brks',
    'Burg': 'Bg',
    'Burgs': 'Bgs',
    'Bypass': 'Byp',
    'Calle': 'Cll',
    'Camp': 'Cp',
    'Canyon': 'Cyn',
    'Cape': 'Cpe',
    'Causeway': 'Cswy',
    'Center': 'Ctr',
    'Centers': 'Ctrs',
    'Circle': 'Cir',
    'Circles': 'Cirs',
    'Cliff': 'Clf',
    'Cliffs': 'Clfs',
    'Club': 'Clb',
    'Common': 'Cmn',
    'Corner': 'Cor',
    'Course': 'Crse',
    'Court': 'Ct',
    'Courts': 'Cts',
    'Cove': 'Cv',
    'Creek': 'Crk',
    'Crescent': 'Cres',
    'Crest': 'Crst',
    'Crossing': 'Xing',
    'Curve': 'Curv',
    'Dale': 'Dl',
    'Dam': 'Dm',
    'Divide': 'Dv',
    'Drive': 'Dr',
    'Drives': 'Drs',
    'East': 'E',
    'Estate': 'Est',
    'Estates': 'Ests',
    'Expressway': 'Expy',
    'Extension': 'Ext',
    'Extensions': 'Exts',
    'Falls': 'Fls',
    'Ferry': 'Fry',
    'Field': 'Fld',
    'Fields': 'Flds',
    'Flat': 'Flt',
    'Flats': 'Flts',
    'Ford': 'Frd',
    'Forest': 'Frst',
    'Forge': 'Frg',
    'Forges': 'Frgs',
    'Fork': 'Frk',
    'Fort': 'Ft',
    'Freeway': 'Fwy',
    'Grade': 'Grd',
    'Green': 'Grn',
    'Harbor': 'Hbr',
    'Harbors': 'Hbrs',
    'Haven': 'Hvn',
    'Heights': 'Hts',
    'Highway': 'Hwy',
    'Hill': 'Hl',
    'Hills': 'Hls',
    'Hollow': 'Holw',
    'Industrial': 'Ind',
    'Interstate': 'I',
    'Island': 'Is',
    'Islands': 'Iss',
    'Junction': 'Jct',
    'Junctions': 'Jcts',
    'Junior': 'Jr',
    'Key': 'Ky',
    'Keys': 'Kys',
    'Knoll': 'Knl',
    'Knolls': 'Knls',
    'Lake': 'Lk',
    'Lakes': 'Lks',
    'Landing': 'Lndg',
    'Lane': 'Ln',
    'Lieutenant': 'Lt',
    'Light': 'Lgt',
    'Lights': 'Lgts',
    'Loaf': 'Lf',
    'Lock': 'Lck',
    'Locks': 'Lcks',
    'Lodge': 'Ldg',
    'Mall': 'Mal',
    'Manor': 'Mnr',
    'Manors': 'Mnrs',
    'Meadow': 'Mdw',
    'Meadows': 'Mdws',
    'Mill': 'Ml',
    'Mission': 'Msn',
    'Moorhead': 'Mhd',
    'Motorway': 'Mtwy',
    'Mountain': 'Mtn',
    'Mount': 'Mt',
    'Neck': 'Nck',
    'Northeast': 'NE',
    'North': 'N',
    'Northwest': 'NW',
    'Orchard': 'Orch',
    'Overpass': 'Ovps',
    'Parkway': 'Pky',
    'Passage': 'Psge',
    'Place': 'Pl',
    'Plain': 'Pln',
    'Plains': 'Plns',
    'Plaza': 'Plz',
    'Point': 'Pt',
    'Points': 'Pts',
    'Port': 'Prt',
    'Ports': 'Prts',
    'Prairie': 'Pr',
    'Private': 'Pvt',
    'Radial': 'Radl',
    'Ranch': 'Rnch',
    'Rapid': 'Rpd',
    'Rapids': 'Rpds',
    'Rest': 'Rst',
    'Ridge': 'Rdg',
    'Ridges': 'Rdgs',
    'River': 'Riv',
    'Road': 'Rd',
    'Roads': 'Rds',
    'Route': 'Rte',
    'Saint': 'St',
    'Senior': 'Sr',
    'Sergeant': 'Sgt',
    'Shoal': 'Shl',
    'Shoals': 'Shls',
    'Shore': 'Shr',
    'Shores': 'Shrs',
    'Skyway': 'Sky',
    'Southeast': 'SE',
    'South': 'S',
    'Southwest': 'SW',
    'Spring': 'Spg',
    'Springs': 'Spgs',
    'Square': 'Sq',
    'Squares': 'Sqs',
    'Station': 'Sta',
    'Stream': 'Strm',
    'Streets': 'Sts',
    'Street': 'St',
    'Summit': 'Smt',
    'Terrace': 'Ter',
    'Thoroughfare': 'Thfr',
    'Thruway': 'Thwy',
    'Trace': 'Trce',
    'Trafficway': 'Tfwy',
    'Trail': 'Trl',
    'Tunnel': 'Tunl',
    'Turnpike': 'Tpke',
    'Underpass': 'Unp',
    'Unions': 'Uns',
    'Union': 'Un',
    'Valleys': 'Vlys',
    'Valley': 'Vly',
    'Viaduct': 'Via',
    'Views': 'Vws',
    'View': 'Vw',
    'Villages': 'Vlgs',
    'Village': 'Vlg',
    'Ville': 'Vl',
    'Vista': 'Vis',
    'Walkway': 'Wlky',
    'West': 'W',
    'San Francisco': 'sf',
    'Rio': 'R',
    'S.': 'S'
};

const tokens = token.createReplacer(tokenList);
const tokensR = token.createReplacer(tokenList, { includeUnambiguous: true });

// this is a test function that returns "saint" if the match is at the beginning, "street"
// if it's at the end, or "st" otherwise. In real life you'd want something smarter than this
const tokensRC = token.createReplacer(tokenList, {
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

test('token replacement', (t) => {
    t.deepEqual(token.replaceToken(tokens, 'fargo street northeast, san francisco'), { query: 'fargo St NE, sf', lastWord: true });
    t.deepEqual(token.replaceToken(tokens, 'coolstreet'), { query: 'coolstreet', lastWord: false });
    t.deepEqual(token.replaceToken(tokens, 'streetwise'), { query: 'streetwise', lastWord: false });

    t.deepEqual(
        token.enumerateTokenReplacements(tokens, 'fargo street northeast, san francisco'),
        [
            'fargo St NE, sf',
            'fargo St NE, san francisco',
            'fargo street NE, sf', 'fargo street NE, san francisco',
            'fargo St northeast, sf',
            'fargo St northeast, san francisco',
            'fargo street northeast, sf',
            'fargo street northeast, san francisco'
        ]
    );
    t.deepEqual(token.enumerateTokenReplacements(tokens, 'main st street st st milwaukee lane ln wtf ln'), [
        'main st St st st milwaukee Ln ln wtf ln',
        'main st street st st milwaukee Ln ln wtf ln',
        'main st St st st milwaukee lane ln wtf ln',
        'main st street st st milwaukee lane ln wtf ln'
    ]);
    t.deepEqual(token.enumerateTokenReplacements(tokensR, 'main st street st st milwaukee lane ln wtf ln'), [
        'main st St st st milwaukee Ln ln wtf ln',
        'main st St st st milwaukee Ln ln wtf Lane',
        'main st St st st milwaukee Lane ln wtf Lane',
        'main st St st st milwaukee Lane Lane wtf Lane',
        'main st street st st milwaukee Ln ln wtf ln',
        'main st street st st milwaukee Ln ln wtf Lane',
        'main st street st st milwaukee Lane ln wtf Lane',
        'main st street st st milwaukee Lane Lane wtf Lane',
        'main st St st st milwaukee lane ln wtf ln',
        'main st St st st milwaukee lane Lane wtf ln',
        'main st street st st milwaukee lane ln wtf ln',
        'main st street st st milwaukee lane Lane wtf ln'
    ]);

    t.deepEqual(token.enumerateTokenReplacements(tokens, 'coolstreet'),['coolstreet']);
    t.deepEqual(token.enumerateTokenReplacements(tokens, 'streetwise'),['streetwise']);

    // Demonstrate that replacements can cascade, but our current behavior is
    // quite non-deterministic because token order matters very much for the
    // variants that will actually get hit.
    let ubTokens;
    ubTokens = token.createReplacer({
        'ü': { skipBoundaries: true, skipDiacriticStripping: true, text: 'ue' },
        'uber': 'üb',
    });
    t.deepEqual(token.enumerateTokenReplacements(ubTokens, 'uber cat'),['üb cat', 'uber cat'], 'does not cascade replacements');
    ubTokens = token.createReplacer({
        'uber': 'üb',
        'ü': { skipBoundaries: true, skipDiacriticStripping: true, text: 'ue' },
    });
    t.deepEqual(token.enumerateTokenReplacements(ubTokens, 'uber cat'),['ueb cat', 'üb cat', 'uber cat'], 'hits all permutations');


    t.end();
});

test('custom reverse replacement', (t) => {
    t.deepEqual(token.replaceToken(tokensRC, 'st thomas st united states'), { query: 'saint thomas st united states', lastWord: false });
    t.deepEqual(token.replaceToken(tokensRC, 'e first st'), { query: 'East First street', lastWord: false });

    t.deepEqual(token.enumerateTokenReplacements(tokensRC, 'st thomas st united states'), [
        'st thomas st united states',
        'saint thomas st united states'
    ]);
    t.deepEqual(token.enumerateTokenReplacements(tokensRC, 'e first st'), [
        'e 1st st',
        'e 1st street',
        'East 1st st',
        'East 1st street',
        'e first st',
        'e first street',
        'East first st',
        'East first street'
    ]);

    t.end();
});

test('named/numbered group replacement', (t) => {
    const tokens = token.createReplacer({
        'abc': 'xyz',
        '(1\\d+)': '@@@$1@@@',
        '(?<number>2\\d+)': '###${number}###'
    });
    t.deepEqual(token.replaceToken(tokens, 'abc 123 def'), { query: 'xyz @@@123@@@ def', lastWord: false });
    t.deepEqual(token.replaceToken(tokens, 'abc 234 def'), { query: 'xyz ###234### def', lastWord: false });
    t.deepEqual(token.replaceToken(tokens, 'abc 123'), { query: 'xyz @@@123@@@', lastWord: false });
    t.deepEqual(token.replaceToken(tokens, 'abc 234'), { query: 'xyz ###234###', lastWord: false });
    t.deepEqual(token.enumerateTokenReplacements(tokens, 'abc 123 def'), ['xyz @@@123@@@ def', 'xyz 123 def', 'abc @@@123@@@ def', 'abc 123 def']);
    t.deepEqual(token.enumerateTokenReplacements(tokens, 'abc 234 def'), ['xyz ###234### def', 'xyz 234 def', 'abc ###234### def', 'abc 234 def']);

    t.end();
});

test('throw on mixed name/num replacement groups', (t) => {
    t.throws(() => {
        token.createReplacer({ '(abc)(?<namedgroup>def)': '${namedgroup}$1' });
    });
    t.end();
});

test('detect word boundaries and compare lastTerms', (t) => {
    t.deepEqual(token.replaceToken(tokens, 'Rio de Janeiro'), { query: 'R de Janeiro', lastWord: false }, 'phrase-initial token');
    t.deepEqual(token.replaceToken(tokens, 'de rio Janeiro'), { query: 'de R Janeiro', lastWord: false }, 'phrase-medial token');
    t.deepEqual(token.replaceToken(tokens, 'de Janeiro Rio'), { query: 'de Janeiro R', lastWord: true }, 'phrase-terminal token');
    t.deepEqual(token.replaceToken(tokens, 'de-Janeiro!Rio??'), { query: 'de-Janeiro!R??', lastWord: true }, 'punctuation-separated token');
    t.deepEqual(token.replaceToken(tokens, 'deteriorate'), { query: 'deteriorate', lastWord: false }, "word-medial token (doesn't replace)");
    t.deepEqual(token.replaceToken(tokens, 'Rua Oratório'), { query: 'Rua Oratório', lastWord: false }, "word-terminal token preceded by accented character (doesn't replace)");
    t.end();
});

test('Flag last word token replacements only if the entire word is replaced with a simple token replacement', (t) => {
    const replacer = token.createReplacer({
        'Street': 'St',
        '([a-z]+)väg': '$1v',
        'väg([a-z]+)': 'v$1',
        'ä': { skipBoundaries: true, skipDiacriticStripping: true, text: 'ae' },
        'ö': { skipBoundaries: true, skipDiacriticStripping: true, text: 'oe' },
        'ü': { skipBoundaries: true, skipDiacriticStripping: true, text: 'ue' },
        '(?<number>2\\d+)': '###${number}###',
        'Saint': 'St'
    });
    t.deepEqual(token.replaceToken(replacer, 'Clancy Street'), { query: 'Clancy St', lastWord: true });
    t.deepEqual(token.replaceToken(replacer, 'Mäster'), { query: 'Maester', lastWord: false });
    t.deepEqual(token.replaceToken(replacer, 'Köln'), { query: 'Koeln', lastWord: false });
    t.deepEqual(token.replaceToken(replacer, 'Bürbarg'), { query: 'Buerbarg', lastWord: false });
    t.deepEqual(token.replaceToken(replacer, 'Samuelsväg'), { query: 'Samuelsv', lastWord: false });
    t.deepEqual(token.replaceToken(replacer, 'vägabond'), { query: 'vabond', lastWord: false });
    t.deepEqual(token.replaceToken(replacer, 'vägabond street'), { query: 'vabond St', lastWord: true });
    t.deepEqual(token.replaceToken(replacer, 'street vägabond'), { query: 'St vabond', lastWord: false });
    t.deepEqual(token.replaceToken(replacer, '234'), { query: '###234###', lastWord: false });
    t.deepEqual(token.replaceToken(replacer, 'Bad Saint'), { query: 'Bad St', lastWord: true });
    t.end();
});

test('replace complex global tokens', (t) => {
    const replacer = token.createGlobalReplacer({
        '\\b(.+)(strasse|str|straße)\\b': '$1 str'
    });
    t.deepEqual(token.replaceToken(replacer, 'talstrasse'), { query: 'tal str', lastWord: false }, 'talstrasse => tal str');
    t.deepEqual(token.replaceToken(replacer, 'talstraße'), { query: 'tal str', lastWord: false }, 'talstraße => tal str');
    t.deepEqual(token.replaceToken(replacer, 'talstr'), { query: 'tal str', lastWord: false }, 'talstr => tal str');
    t.deepEqual(token.replaceToken(replacer, 'talstrasse 3-5'), { query: 'tal str 3-5', lastWord: false }, 'talstrasse 3-5 => tal str 3-5');
    t.deepEqual(token.replaceToken(replacer, 'talstraße 3-5'), { query: 'tal str 3-5', lastWord: false }, 'talstraße 3-5 => tal str 3-5');
    t.deepEqual(token.replaceToken(replacer, 'talstr 3-5'), { query: 'tal str 3-5', lastWord: false }, 'talstr 3-5 => tal str 3-5');
    t.end();
});
