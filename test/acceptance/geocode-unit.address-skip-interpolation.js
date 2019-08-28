'use strict';
const tape = require('tape');
const skipInterpolation = require('../fixtures/skip-interpolation.json');
const noskipInterpolation = require('../fixtures/no-skip-interpolation.json');
const indexdocs = require('../../lib/indexer/indexdocs');

// skip interpolation for address clusters with large address ranges
(() => {
    tape('index address, where outliers are present', (t) => {
        const address = indexdocs.standardize({
            'type':'Feature',
            'properties':{
                'carmen:addressnumber':[null,['9','35','51','63','64','71','85','86','97','100','131','146','166','382','384','406','432','447','504','509','529','540','551','557','564','577','580','633','680','688','693','735','737','740','753','5000']],
                'carmen:rangetype':'tiger',
                'carmen:parityl':[['E','E',null,null,null],null],
                'carmen:lfromhn':[[null,64,146,null,740],null],
                'carmen:ltohn':[[null,100,688,null,5000],null],
                'carmen:parityr':[['O','O',null,null,null],null],
                'carmen:rfromhn':[[9,51,131,735,null],null],
                'carmen:rtohn':[[35,97,693,753,null],null],
                'carmen:text':'Route De Saint-Firmin Des Vignes,Rue De Saint-Firmin Des Vignes',
                'carmen:geocoder_stack':'fr',
                'carmen:center':[2.738896,47.976618]
            },
            'geometry':{
                'type':'GeometryCollection',
                'geometries':[{
                    'type':'MultiLineString',
                    'coordinates':[[[2.733636,47.977989],[2.733769,47.97804],[2.733917,47.978064],[2.734014,47.978053],[2.7344,47.977941],[2.734634,47.977873],[2.73474,47.977842],[2.735638,47.977581],[2.736003,47.977494],[2.737952,47.976852],[2.738309,47.976739],[2.738984,47.976533],[2.739236,47.976454],[2.7397501214694895,47.97629221416985]],[[2.741093,47.975747],[2.741179,47.975733],[2.741319,47.975694],[2.741674,47.975664],[2.743397,47.975121],[2.743563,47.975068]],[[2.734634,47.977873],[2.734725,47.977875],[2.735028,47.977784],[2.735105,47.977772],[2.735175,47.977787]],[[2.7344,47.977941],[2.734392,47.977994],[2.734332,47.978043]],[[2.7397501214694895,47.97629221416985],[2.739951,47.976229],[2.740315,47.976115],[2.740551,47.975989],[2.740809,47.975867],[2.740882,47.975826]]] },{
                    'type':'MultiPoint',
                    'coordinates':[[2.743338,47.975112],[2.743055,47.975205],[2.742837,47.975259],[2.742722,47.975299],[2.742649,47.975425],[2.742639,47.975326],[2.742454,47.975389],[2.742372,47.975521],[2.74224,47.975451],[2.742417,47.975505],[2.741927,47.975542],[2.741809,47.975725],[2.741874,47.975675],[2.738917,47.976612],[2.738896,47.976618],[2.738667,47.976751],[2.738364,47.976845],[2.737942,47.976792],[2.737434,47.977034],[2.737406,47.976957],[2.737045,47.97707],[2.737397,47.977046],[2.73768,47.976885],[2.73673,47.977168],[2.73737,47.977057],[2.736447,47.977258],[2.737352,47.977062],[2.735665,47.977504],[2.737246,47.977102],[2.737237,47.977104],[2.737251,47.977016],[2.737123,47.977055],[2.734954,47.977713],[2.737182,47.977124],[2.734155,47.977959],[2.743297,47.975212]]
                }]
            },
            'id':395484891
        }, 6, {});
        t.deepEquals(address, skipInterpolation, 'Ok, set interpolation values to null');
        t.end();
    });
})();

// address range that increases in progression
(() => {
    tape('index address, where outliers are not present', (t) => {
        const address = indexdocs.standardize({
            'type': 'Feature',
            'id':1,
            'properties': {
                'carmen:text':'WASHINGTON STREET',
                'carmen:center':[0,0],
                'carmen:rangetype':'tiger',
                'carmen:parityl':[['E', 'E',null,null],null],
                'carmen:lfromhn':[[740,146,null,null],null],
                'carmen:ltohn':[[700,100,null,null],null],
                'carmen:parityr':[['O','O',null,null],null],
                'carmen:rfromhn':[[753,101,null,null],null],
                'carmen:rtohn':[[101,9,null,null,null],null],
                'carmen:addressnumber':[null,['70','100a','130','160']]
            },
            'geometry': {
                'type':'GeometryCollection',
                'geometries':[{
                    'type':'MultiLineString',
                    'coordinates':[[[0,0],[0,0],[0,0],[0,0]]] },{
                    'type':'MultiPoint',
                    'coordinates':[[0,0],[0,0],[0,0],[0,0]]
                }]
            }
        }, 6, {});
        t.deepEquals(address, noskipInterpolation, 'Ok, doesn\'t skip interpolation');
        t.end();
    });
})();
