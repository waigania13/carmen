'use strict';
const indexdocs = require('../../../lib/indexer/indexdocs.js');
const grid = require('../../../lib/util/grid.js');
const tape = require('tape');
const token = require('../../../lib/text-processing/token.js');
const rewind = require('geojson-rewind');
const fs = require('fs');
const path = require('path');

tape('indexdocs.loadDoc', (t) => {
    const simple_replacer = token.createSimpleReplacer({});
    const complex_replacer = token.createComplexReplacer({});

    const patch = { grid:{}, docs:[], text:[] };
    const freq = {};
    const tokens = ['main', 'st'];
    const zoom = 12;
    const doc = {
        id: 1,
        type: 'Feature',
        properties: {
            'carmen:text': 'main st',
            'carmen:center': [0, 0],
            'carmen:zxy': ['6/32/32', '6/33/33'],
            'carmen:score': 100
        },
        geometry: {
            type: 'Point',
            coordinates: [0,0]
        }
    };

    freq['__COUNT__'] = [101];
    freq['__MAX__'] = [200];
    freq[tokens[0]] = [1];
    freq[tokens[1]] = [100];

    // Indexes single doc.
    const err = indexdocs.loadDoc(freq, patch, doc, { lang: { has_languages: false, autopopulate: {} } }, zoom, simple_replacer, complex_replacer);
    t.ok(typeof err !== 'number', 'no error');

    t.deepEqual(Object.keys(patch.grid).length, 2, '2 patch.grid entries');
    t.deepEqual(Array.from(patch.grid[Object.keys(patch.grid)[0]].keys()), ['default'], '1 language in patch.grid[0]');
    t.deepEqual(patch.grid[Object.keys(patch.grid)[0]].get('default').length, 2, '2 grids for language "all" in patch.grid[0]');
    t.deepEqual(grid.decode(patch.grid[Object.keys(patch.grid)[0]].get('default')[0]), {
        id: 1,
        relev: 1,
        score: 7, // log scales score of 100 based on max score value of 200
        x: 32,
        y: 32
    }, 'patch.grid[0][0]');
    t.deepEqual(patch.docs.length, 1);
    t.deepEqual(patch.docs[0], doc);
    t.deepEqual(patch.text, ['main st', 'main']);

    t.end();
});

tape('indexdocs.standardize', (t) => {
    t.test('indexdocs.standardize - carmen:center & carmen:zxy calculated', (q) => {
        const res = indexdocs.standardize({
            id: 1,
            type: 'Feature',
            properties: {
                'carmen:text': 'main street'
            },
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        }, 6, {});

        q.deepEquals(res, { geometry: { coordinates: [0, 0], type: 'Point' }, id: 1, properties: { 'carmen:center': [0, 0], 'carmen:text': 'main street', 'carmen:zxy': ['6/32/32'] }, type: 'Feature' });
        q.end();
    });

    t.test('indexdocs.standardize - geometry that breaks tilecover is fixed', (q) => {
        const usaRow = fs.readFileSync(path.resolve(__dirname, '../../fixtures/docs.jsonl'), 'utf8').split('\n')[4];
        const brokenUsa = JSON.parse(usaRow);
        // push an empty polygon onto the end of the multypolygon
        brokenUsa.geometry.coordinates[0].push([
            [-100, 27],
            [-100, 27],
            [-100, 27],
            [-100, 27]
        ]);
        q.doesNotThrow(() => indexdocs.standardize(brokenUsa, 6, {}));

        const brokenCollection = JSON.parse(usaRow);
        brokenCollection.geometry = {
            type: 'GeometryCollection',
            geometries: [
                brokenUsa.geometry
            ]
        };
        q.doesNotThrow(() => indexdocs.standardize(brokenCollection, 6, {}));

        q.end();
    });

    t.test('indexdocs.standardize - Must be MultiPoint or GeometryCollection', (q) => {
        q.throws(() => {
            indexdocs.standardize({
                id: 1,
                type: 'Feature',
                properties: {
                    'carmen:text': 'main street',
                    'carmen:center': [0,0],
                    'carmen:addressnumber': [9]
                },
                geometry: {
                    type: 'Point',
                    coordinates: [0,0]
                }
            }, 6, {});
        }, /carmen:addressnumber must be MultiPoint or GeometryCollection/);

        q.end();
    });

    t.test('indexdocs.standardize - Must be MultiPoint or GeometryCollection', (q) => {
        q.throws(() => {
            indexdocs.standardize({
                id: 1,
                type: 'Feature',
                properties: {
                    'carmen:text': 'main street',
                    'carmen:center': [0,0],
                    'carmen:addressnumber': [9]
                },
                geometry: {
                    type: 'Point',
                    coordinates: [0,0]
                }
            }, 6, {});
        }, /carmen:addressnumber must be MultiPoint or GeometryCollection/);

        q.end();
    });

    t.test('indexdocs.standardize - carmen:addressnumber parallel arrays must equal', (q) => {
        q.throws(() => {
            indexdocs.standardize({
                id: 1,
                type: 'Feature',
                properties: {
                    'carmen:text': 'main street',
                    'carmen:center': [0,0],
                    'carmen:addressnumber': [9]
                },
                geometry: {
                    type: 'MultiPoint',
                    coordinates: [[0,0], [0,0]]
                }
            }, 6, {});
        }, /carmen:addressnumber\[i\] array must be equal to geometry.geometries\[i\] array/);

        q.end();
    });

    t.test('indexdocs.standardize - carmen:addressnumber MultiPoint => GeometryCollection', (q) => {
        const res = indexdocs.standardize({
            id: 1,
            type: 'Feature',
            properties: {
                'carmen:text': 'main street',
                'carmen:center': [0,0],
                'carmen:addressnumber': [9]
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,0]]
            }
        }, 6, {});

        q.deepEquals(res, { 'id':1,'type':'Feature','properties':{ 'carmen:text':'main street','carmen:center':[0,0],'carmen:addressnumber':[[9]],'carmen:zxy':['6/32/32'] },'geometry':{ 'type':'GeometryCollection','geometries':[{ 'type':'MultiPoint','coordinates':[[0,0]] }] } });
        q.end();
    });

    t.test('indexdocs.standardize - carmen:addressnumber lowercased', (q) => {
        const res = indexdocs.standardize({
            id: 1,
            type: 'Feature',
            properties: {
                'carmen:text': 'main street',
                'carmen:center': [0,0],
                'carmen:addressnumber': ['9A']
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,0]]
            }
        }, 6, {});

        q.deepEquals(res, { 'id':1,'type':'Feature','properties':{ 'carmen:text':'main street','carmen:center':[0,0],'carmen:addressnumber':[['9a']],'carmen:zxy':['6/32/32'] },'geometry':{ 'type':'GeometryCollection','geometries':[{ 'type':'MultiPoint','coordinates':[[0,0]] }] } });
        q.end();
    });

    t.test('indexdocs.standardize - carmen:rangetype invalid', (q) => {
        q.throws((t) => {
            indexdocs.standardize({
                id: 1,
                type: 'Feature',
                properties: {
                    'carmen:text': 'main street',
                    'carmen:center': [0,0],
                    'carmen:rangetype': 'tiger'
                },
                geometry: {
                    type: 'MultiPoint',
                    coordinates: [[0,0]]
                }
            }, 6, {});
        }, /ITP results must be a LineString, MultiLineString, or GeometryCollection/);

        q.end();
    });

    t.test('indexdocs.standardize - carmen:rangetype LineString => GeometryCollection', (q) => {
        const res = indexdocs.standardize({
            id: 1,
            type: 'Feature',
            properties: {
                'carmen:text': 'main street',
                'carmen:center': [0,0],
                'carmen:rangetype': 'tiger',
                'carmen:parityl': 'E',
                'carmen:parityr': 'O',
                'carmen:lfromhn': '2',
                'carmen:ltohn': '100',
                'carmen:rfromhn': '1',
                'carmen:rtohn': '101'
            },
            geometry: {
                type: 'LineString',
                coordinates: [[0,0], [1,1]]
            }
        }, 6, {});

        q.deepEquals(res, { 'id':1,'type':'Feature','properties':{ 'carmen:text':'main street','carmen:center':[0,0],'carmen:rangetype':'tiger','carmen:parityl':[['E']],'carmen:parityr':[['O']],'carmen:lfromhn':[['2']],'carmen:ltohn':[['100']],'carmen:rfromhn':[['1']],'carmen:rtohn':[['101']],'carmen:zxy':['6/32/31','6/32/32'] },'geometry':{ 'type':'GeometryCollection','geometries':[{ 'type':'MultiLineString','coordinates':[[[0,0],[1,1]]] }] } });
        q.end();
    });

    t.test('indexdocs.standardize - carmen:rangetype MultiLineString => GeometryCollection', (q) => {
        const res = indexdocs.standardize({
            id: 1,
            type: 'Feature',
            properties: {
                'carmen:text': 'main street',
                'carmen:center': [0,0],
                'carmen:rangetype': 'tiger',
                'carmen:parityl': ['E'],
                'carmen:parityr': ['O'],
                'carmen:lfromhn': ['2'],
                'carmen:ltohn': ['100'],
                'carmen:rfromhn': ['1'],
                'carmen:rtohn': ['101']
            },
            geometry: {
                type: 'MultiLineString',
                coordinates: [[[0,0], [1,1]]]
            }
        }, 6, {});

        q.deepEquals(res, { 'id':1,'type':'Feature','properties':{ 'carmen:text':'main street','carmen:center':[0,0],'carmen:rangetype':'tiger','carmen:parityl':[['E']],'carmen:parityr':[['O']],'carmen:lfromhn':[['2']],'carmen:ltohn':[['100']],'carmen:rfromhn':[['1']],'carmen:rtohn':[['101']],'carmen:zxy':['6/32/31','6/32/32'] },'geometry':{ 'type':'GeometryCollection','geometries':[{ 'type':'MultiLineString','coordinates':[[[0,0],[1,1]]] }] } });
        q.end();
    });

    t.test('indexdocs.standardize - carmen:zxy exceeds 10000 covers', (q) => {
        // Build a zxy list with covers of letying distance from center.
        const central = ['6/32/32','6/33/33','6/31/31','6/32/30','6/30/32'];
        const covers = [];
        let i;
        for (i = 0; i < 10000; i++) { covers.push('6/40/40'); }
        for (i = 0; i < 100; i++) central.forEach((central) => {
            covers.push(central);
        });

        const res = indexdocs.standardize({
            id: 1,
            type: 'Feature',
            properties: {
                'carmen:text': 'main street',
                'carmen:center': [0,0],
                'carmen:zxy': covers
            },
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        }, 6, {});

        q.deepEqual(res.properties['carmen:zxy'].length, 10000, 'truncates carmen:zxy to 10000');
        central.forEach((cover) => {
            t.deepEqual(res.properties['carmen:zxy'].filter((zxy) => { return zxy === cover; }).length, 100, 'sort preserves covers closest to center: ' + cover);
        });
        q.end();
    });

    t.end();
});

tape('indexdocs.verifyCenter', (t) => {
    t.equal(indexdocs.verifyCenter([0,0], [[0,0,0]]), true, 'center in tiles');
    t.equal(indexdocs.verifyCenter([0,-45], [[0,0,1],[1,0,1]]), false, 'center outside tiles');
    t.equal(indexdocs.verifyCenter([0,null], [[32,32,6]]), false, 'handle null lon');
    t.equal(indexdocs.verifyCenter([null,0], [[32,32,6]]), false, 'handle null lat');
    t.equal(indexdocs.verifyCenter([null,null], [[32,32,6]]), false, 'handle null lon,lat');
    t.end();
});

tape('indexdocs.runChecks', (t) => {
    t.throws(() => {
        indexdocs.runChecks({});
    }, /doc has no id/);

    t.throws(() => {
        indexdocs.runChecks({
            id:1,
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        });
    }, /doc has no carmen:text on id:1/);

    // we don't expect this one to throw because it has lots of synonyms but is not an address
    t.doesNotThrow(() => {
        indexdocs.runChecks({
            id:1,
            type: 'Feature',
            properties: {
                'carmen:text':'Main Street 1,Main Street 2,Main Street 3,Main Street 4,Main Street 5,Main Street 6,Main Street 7,Main Street 8,Main Street 9,Main Street 10,Main Street 11'
            },
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        });
    }, '11 synonyms is fine if it\'s not an address');

    t.throws(() => {
        indexdocs.runChecks({
            id:1,
            type: 'Feature',
            properties: {
                'carmen:text':'Main Street 1,Main Street 2,Main Street 3,Main Street 4,Main Street 5,Main Street 6,Main Street 7,Main Street 8,Main Street 9,Main Street 10,Main Street 11',
                'carmen:addressnumber': [null, ['1175', '1180', '1212', '1326']]
            },
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        });
    }, /doc's carmen:text on id:1 has more than the allowed 10 synonyms/, '11 synonyms is too many if an address number is present');

    t.throws(() => {
        indexdocs.runChecks({
            id:1,
            type: 'Feature',
            properties: {
                'carmen:text':'Main Street 1,Main Street 2,Main Street 3,Main Street 4,Main Street 5,Main Street 6,Main Street 7,Main Street 8,Main Street 9,Main Street 10,Main Street 11',
                'carmen:rangetype': 'tiger'
            },
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        });
    }, /doc's carmen:text on id:1 has more than the allowed 10 synonyms/, '11 synonyms is too many if a range type is present');

    t.throws(() => {
        indexdocs.runChecks({
            id:1,
            type: 'Feature',
            properties: {
                'carmen:text':'Main Street 1,Main Street 2,Main Street 3,Main Street 4,Main Street 5,Main Street 6,Main Street 7,Main Street 8,Main Street 9,Main Street 10,Main Street 11',
                'carmen:addressnumber': [null, ['1175', '1180', '1212', '1326']],
                'carmen:rangetype': 'tiger'
            },
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        });
    }, /doc's carmen:text on id:1 has more than the allowed 10 synonyms/, '11 synonyms is too many if both are present');

    t.throws(() => {
        indexdocs.runChecks({
            id:1,
            type: 'Feature',
            properties: {
                'carmen:text':'Main Street'
            }
        });
    }, /"geometry" member required on id:1/);

    // GeometryCollection with a single geometry is caught and not thrown from GeoJSONHint
    t.equal(indexdocs.runChecks({
        id:1,
        type: 'Feature',
        properties: {
            'carmen:text':'Main Street',
            'carmen:center':[0,0],
            'carmen:addressnumber': [9,10,7],
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type: 'MultiPoint',
                coordinates: [[1,1], [2,2], [0,0]]
            }]
        }
    }), undefined);

    t.throws(() => {
        indexdocs.runChecks({
            id:1,
            type: 'Feature',
            properties: {
                'carmen:text':'Main Street',
                'carmen:center':[0,0]
            },
            geometry: { type: 'Polygon', coordinates: [new Array(60e3)] }
        }, 12);
    }, /a number was found where a coordinate array should have been found: this needs to be nested more deeply on id:1/);

    const coords = [Array.apply(null, Array(50001)).map((ele, i) => {return [1.1 + 0.001 * i,1.1];})];
    coords[0].push([1.1,1.1]);

    t.throws(() => {
        indexdocs.runChecks(rewind({
            id:1,
            type: 'Feature',
            properties: {
                'carmen:text':'Main Street',
                'carmen:center':[0,0]
            },
            geometry: { type: 'Polygon', coordinates: coords }
        }), 12);
    }, /Polygons may not have more than 50k vertices. Simplify your polygons, or split the polygon into multiple parts on id:1/);

    t.throws(() => {
        indexdocs.runChecks({
            id:1,
            type: 'Feature',
            properties: {
                'carmen:text':'Main Street',
                'carmen:center':[0,0]
            },
            geometry: { type: 'MultiPolygon', coordinates: [[new Array(30e3)],[new Array(30e3)]] }
        }, 12);
    }, /a number was found where a coordinate array should have been found: this needs to be nested more deeply on id:1/);

    t.throws(() => {
        indexdocs.runChecks(rewind({
            id:1,
            type: 'Feature',
            properties: {
                'carmen:text':'Main Street',
                'carmen:center':[0,0]
            },
            geometry: {
                type: 'MultiPolygon',
                coordinates: [
                    coords,
                    coords
                ]
            }
        }), 12);
    }, /Polygons may not have more than 50k vertices. Simplify your polygons, or split the polygon into multiple parts on id:1/);

    t.equal(indexdocs.runChecks({
        id:1,
        type: 'Feature',
        properties: {
            'carmen:text':'Main Street',
            'carmen:center':[0,0]
        },
        geometry: { type: 'Point', coordinates: [0,0] }
    }, 12), undefined);
    t.end();
});

tape('indexdocs.generateFrequency', (t) => {
    const docs = [{
        type: 'Feature',
        properties: {
            'carmen:text': 'main street',
            'carmen:score': 2
        },
        geometry: {}
    },{
        type: 'Feature',
        properties: {
            'carmen:text': 'Main Road',
            'carmen:score': 1
        },
        geometry: {}
    }];
    const geocoder_tokens = token.createSimpleReplacer({ 'street':'st','road':'rd' });
    t.deepEqual(indexdocs.generateFrequency(docs, token.createSimpleReplacer({})), {
        __COUNT__: [4],
        __MAX__: [2],
        main: [2],
        road: [1],
        street: [1]
    });
    // @TODO should 'main' in this case collapse down to 2?
    t.deepEqual(indexdocs.generateFrequency(docs, geocoder_tokens), {
        __COUNT__: [4],
        __MAX__: [2],
        main: [2],
        rd: [1],
        st: [1]
    });
    t.end();
});

tape.only('indexdocs.isOutlierDetected', (t) => {

    t.equal(indexdocs.isOutlierDetected({
        properties: {
            'carmen:parityl': [['O'], null, null],
            'carmen:lfromhn': [[3001], null, null],
            'carmen:ltohn': [[2001], null, null],
            'carmen:parityr': [['E'], null, null],
            'carmen:rfromhn': [[3000], null, null],
            'carmen:rtohn': [[2000], null, null],
        }
    }), false, 'Single ranges pass');

    t.equal(indexdocs.isOutlierDetected({
        properties: {
            'carmen:parityl': [['O'], null, null],
            'carmen:lfromhn': [[200000], null, null],
            'carmen:ltohn': [[1], null, null],
            'carmen:parityr': [['E'], null, null],
            'carmen:rfromhn': [[3000], null, null],
            'carmen:rtohn': [[2000], null, null],
        }
    }), true, '...unless they are huge');

    t.equal(indexdocs.isOutlierDetected({
        properties: {
            'carmen:lfromhn': [[1, 99]],
            'carmen:ltohn':   [[99, 5999]],
            'carmen:parityl': [['O', 'O']],
            'carmen:rfromhn': [[null, null]],
            'carmen:rtohn':   [[null, null]],
            'carmen:parityr': [[null, null]]
        }
    }), false, 'Two ranges always pass');

    t.equal(indexdocs.isOutlierDetected({
        properties: {
            'carmen:lfromhn': [[1, 51, 99]],
            'carmen:ltohn':   [[50, 99, 5999]],
            'carmen:parityl': [['O', 'O']],
            'carmen:rfromhn': [[null, null]],
            'carmen:rtohn':   [[null, null]],
            'carmen:parityr': [[null, null]]
        }
    }), true, 'Outlier in three is detected');

    t.equal(indexdocs.isOutlierDetected({
        properties: {
            'carmen:lfromhn': [[1, 101, 201, 301, 401]],
            'carmen:ltohn':   [[99, 199, 299, 399, 499]],
            'carmen:parityl': [['O', 'O', 'O', 'O', 'O']],
            'carmen:rfromhn': [[null, null, null, null, null]],
            'carmen:rtohn':   [[null, null, null, null, null]],
            'carmen:parityr': [[null, null, null, null, null]]
        }
    }), false, 'Predictable hundred blocks pass');

    t.equal(indexdocs.isOutlierDetected({
        properties: {
            'carmen:lfromhn': [[1, 1001, 2001, 3001, 4001]],
            'carmen:ltohn':   [[99, 1999, 2999, 3999, 4999]],
            'carmen:parityl': [['O', 'O', 'O', 'O', 'O']],
            'carmen:rfromhn': [[null, null, null, null, null]],
            'carmen:rtohn':   [[null, null, null, null, null]],
            'carmen:parityr': [[null, null, null, null, null]]
        }
    }), false, 'A hundred range with low thousands is ok');

    t.equal(indexdocs.isOutlierDetected({
        properties: {
            'carmen:lfromhn': [[1, 10001, 20001, 30001, 40001]],
            'carmen:ltohn':   [[99, 19999, 29999, 39999, 49999]],
            'carmen:parityl': [['O', 'O', 'O', 'O', 'O']],
            'carmen:rfromhn': [[null, null, null, null, null]],
            'carmen:rtohn':   [[null, null, null, null, null]],
            'carmen:parityr': [[null, null, null, null, null]]
        }
    }), false, 'A hundred range with 10k ranges is ok');

    t.equal(indexdocs.isOutlierDetected({
        properties: {
            'carmen:lfromhn': [[1, 201, 301, 401, 501]],
            'carmen:ltohn':   [[1000, 299, 399, 499, 599]],
            'carmen:parityl': [['O', 'O', 'O', 'O', 'O']],
            'carmen:rfromhn': [[null, null, null, null, null]],
            'carmen:rtohn':   [[null, null, null, null, null]],
            'carmen:parityr': [[null, null, null, null, null]]
        }
    }), true, 'A 10k range with hundred ranges contains outlier');

    // Real range that is fairly normal
    t.equal(indexdocs.isOutlierDetected({
        properties: {

            'carmen:lfromhn': [[null, null, null, null, null, null, null]],
            'carmen:ltohn':   [[null, null, null, null, null, null, null]],
            'carmen:parityl': [[null, null, null, null, null, null, null]],

            'carmen:rfromhn': [[60, 140, 190, 390, null, 1720, 2590]],
            'carmen:rtohn':   [[0,  190, 360, 620, null, 1720, 3000]],
            'carmen:parityr': [['E', 'E', 'E', 'E','E','E','E']]
        }
    }), false, 'Molen Road in UT is ok');

    // This is a real range w/ the ends compressed 0/1 -> 1000/1001, 10000/10001 -> 6000/60001
    t.equal(indexdocs.isOutlierDetected({
        properties: {
            'carmen:lfromhn': [[null,1900,2050,2118,2200,2228,2292,2452,2480,2514,2602,2646,2678,2684,2714,2816,2823,2824,null,null,null,null,null,null,null,null,null,null,null,null,null,3479,3599,3645,3697,3733,3773,3849,3855,3885,null,null,4009,4033,4081,4103,4141,4189,4207,4333,4344,4382,4472,null,4538,4558,4594,4622,4678,4710,4750,4802,4834,4846,4866,4920,4956,null,5130,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],null,null],
            'carmen:ltohn': [[null,1000,2050,2140,2214,2290,2390,2452,2512,2584,2640,2646,2678,2708,2772,2820,2823,2824,null,null,null,null,null,null,null,null,null,null,null,null,null,3495,3585,3601,3665,3733,3773,3843,3855,3885,null,null,3999,4033,4081,4095,4133,4163,4197,4219,4372,4408,4506,null,4544,4574,4612,4654,4702,4726,4766,4802,4840,4852,4908,4940,5040,null,6000,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],null,null],
            'carmen:parityl': [[null,'E','E','E','E','E','E','E','E','E','E','E','E','E','E','E','O','E',null,null,null,null,null,null,null,null,null,null,null,null,null,'O','O','O','O','O','O','O','O','O',null,null,'O','O','O','O','O','O','O','O','E','E','E',null,'E','E','E','E','E','E','E','E','E','E','E','E','E',null,'E',null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],null,null],
            'carmen:rfromhn': [[1000,1861,null,null,null,null,2325,2429,2471,2515,2605,2649,2667,2691,2723,2805,null,null,2889,2896,3003,3028,3147,3154,3194,3220,3288,3289,3312,3408,3411,3484,3530,3650,3700,3730,3746,null,null,null,3934,3964,null,4054,null,4114,null,4184,4202,4330,4363,4383,4439,4517,4533,4557,null,4627,4673,null,4735,4791,null,null,4865,4923,4963,5051,5085,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],null,null],
            'carmen:rtohn': [[2903,1871,null,null,null,null,2331,2443,2535,2589,2633,2659,2667,2699,2781,2805,null,null,2899,2888,3005,2900,3205,3070,3166,3204,3250,3317,3312,3322,3411,3484,3504,3568,3648,3730,3746,null,null,null,3930,3946,null,4054,null,4114,null,4166,4196,4210,4375,4417,4507,4517,4549,4575,null,4627,4697,null,4785,4799,null,null,4895,4935,5045,5073,6001,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],null,null],
            'carmen:parityr': [['O','O',null,null,null,null,'O','O','O','O','O','O','O','O','O','O',null,null,'O','E','O','E','O','E','E','E','E','O','E','E','O','E','E','E','E','E','E',null,null,null,'E','E',null,'E',null,'E',null,'E','E','E','O','O','O','O','O','O',null,'O','O',null,'O','O',null,null,'O','O','O','O','O',null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],null,null]
        }
    }), false,  'Chamblee Tucker Road in Atlanta is ok');

    t.end();
});
