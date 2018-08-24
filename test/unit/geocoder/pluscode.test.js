'use strict';
const pluscode = require('../../../lib/geocoder/pluscode');
const test = require('tape');

test('pluscode validity tests', (t) => {

    //Test data for validity tests.
    //Format of each array is: [code,isValid,isShort,isFull]

    const fixtures = [
        // Valid full codes:
        ['8FWC2345+G6',true,false,true],
        ['8FWC2345+G6G',true,false,true],
        ['8fwc2345+',true,false,true],
        ['8FWCX400+',true,false,true],

        // Valid short codes:
        ['WC2345+G6g',true,true,false],
        ['2345+G6',true,true,false],
        ['45+G6',true,true,false],
        ['+G6',true,true,false],

        // Invalid codes
        ['G+',false,false,false],
        ['+',false,false,false],
        ['8FWC2345+G',false,false,false],
        ['8FWC2_45+G6',false,false,false],
        ['8FWC2η45+G6',false,false,false],
        ['8FWC2345+G6+',false,false,false],
        ['8FWC2300+G6',false,false,false],
        ['WC2300+G6g',false,false,false],
        ['WC2345+G',false,false,false]
    ];

    for (const fixture of fixtures) {
        t.equals(pluscode.isValid(fixture[0]), fixture[1], `isValid('${fixture[0]}') should be ${fixture[1] ? 'true' : 'false'}`);
        t.equals(pluscode.isShort(fixture[0]), fixture[2], `isShort('${fixture[0]}') should be ${fixture[2] ? 'true' : 'false'}`);
        t.equals(pluscode.isFull(fixture[0]), fixture[3], `isFull('${fixture[0]}') should be ${fixture[3] ? 'true' : 'false'}`);
    }


    t.end();
});
