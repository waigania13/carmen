'use strict';

const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const queue = require('d3-queue').queue;
const { queueFeature, buildQueued } = require('../../lib/indexer/addfeature');

/*
Let's assume we have a street
1. 9th Street Northwest which is also known as Huckleberry Finn Road, Highway Number 6
2. F Street Northwest which is also known as Highway Number 4

9th Street Northwest intersects with F Street Northwest at [0,2] and Highway Number 2 at [0,1]
The aliases for 9th Street Northwest go in carmen:text separated by a comma. While the streets 9th Street Northwest intersects with goes in the carmen:intersections property.
The coordinates in the geometry correspond to the point of intersection of the street in carmen:intersections and the feature in carmen:text.

Example data spec for intersections:
{
    const address = {
        id:2,
        properties: {
            // Synonyms of the feature go in 'carmen:text'
            'carmen:text': Highway Number 6,9th Street Northwest',
            'carmen:center': [0,0],
            // intersections with the feature go here
            'carmen:intersections': ['F Street Northwest', 'Highway Number 2']
        },
        geometry: {
            type: 'MultiPoint',
            // coordinates correspond to the street in 'carmen:intersection'
            // for example, F Street Northwest and 9th Street Northwest intersect at [0,2]
            coordinates: [[0,2], [0,1]]
        }
    };
    queueFeature(conf.address, address, t.end);
});

Intersections are also supported in the same address cluster as the feature by adding 'carmen:intersections': [null,['1st Avenue', '2nd Avenue', '3rd Avenue'], null] property

And the corresponding coordinates in the geomteries property, the position in the geometries array corresponding to the non null array value  in `'carmen:intersections'`

{
    properties: {
        'carmen:text': 'Main Street Northwest',
        'carmen:addressnumber': [[1, 2, 3], null, null],
        'carmen:intersections': [null,['1st Avenue', '2nd Avenue', '3rd Avenue'], null],
        'carmen:rangetype': 'tiger',
        'carmen:parityl': [[], [], []],
        'carmen:parityr': [[], [], []],
        'carmen:lfromhn': [[], [], []],
        'carmen:rfromhn': [[], [], []],
        'carmen:ltohn': [[], [], []],
        'carmen:rtohn': [[], [], []]
    },
    geometry: {
        type: 'GeometryCollection',
        geometries: [{
            type: 'MultiPoint',
            coordinates: [[1,1], [2,2], [3,3]] <--- addressnumber MultiPoint array is 1st, since addressnumber: [[1, 2, 3], null, null]
        },{
            type: 'MultiPoint',
            coordinates: [[2,2], [3,2], [3,3]] <--- intersections MultiPoint array is 2nd, since intersections: [null,['1st Avenue', '2nd Avenue', '3rd Avenue'], null]
        },{
            type: 'MultiLineString',
            coordinates: [[[1,1], [2,2], [3,3]]]
        }]
    }
};

If there is more than one name for F Street Northwest and it intersects with 9th Street Northwest, the alias is added to carmen:intersections and the corresponding coordinates in the coordinates property of the geometry.
*/

(() => {
    const conf = {
        address: new mem({
            maxzoom: 14,
            geocoder_address: 1,
            geocoder_tokens: { street: 'st', northwest: 'nw', road: 'rd' },
            geocoder_intersection_token: 'and',
            geocoder_format: '{address._number} {address._name}{locality._name}, {place._name}, {region._name} {postcode._name}, {country._name}'
        }, () => {})
    };

    const c = new Carmen(conf);

    // regular addressnumber features
    tape('index address', (t) => {
        const address = {
            id:1,
            properties: {
                'carmen:text': '9th Street Northwest',
                'carmen:center': [0,0],
                'carmen:addressnumber': [500, 200]
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,0], [0,1]]
            }
        };
        queueFeature(conf.address, address, t.end);
    });

    // intersection address data
    tape('index address', (t) => {
        const address = {
            id:2,
            properties: {
                // Synonyms of the feature go in 'carmen:text'
                'carmen:text': 'Highway Number 6,Huckleberry Finn Road,9th Street Northwest,US HWY 1',
                'carmen:center': [0,0],
                // intersections with the feature go here
                'carmen:intersections': ['F Street Northwest', 'Highway Number 4', 'Highway Number 2']
            },
            geometry: {
                type: 'MultiPoint',
                // coordinates correspond to the street in 'carmen:intersection'
                // for example, F Street Northwest and 9th Street Northwest intersect at [0,2]
                coordinates: [[0,2], [0,2], [0,1]]
            }
        };
        queueFeature(conf.address, address, t.end);
    });

    tape('index address', (t) => {
        const address = {
            id:3,
            properties: {
                'carmen:text': 'F Street Northwest',
                'carmen:center': [0,1],
                'carmen:addressnumber': [500]
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,1]]
            }
        };
        queueFeature(conf.address, address, t.end);
    });

    tape('index address', (t) => {
        const address = {
            id:4,
            properties: {
                'carmen:text': 'F Street Northwest,Highway Number 4',
                'carmen:center': [0,0],
                'carmen:intersections': ['9th Street Northwest', 'Frosted Flakes Avenue', 'Abercrombie and Fitch Avenue', 'Huckleberry Finn Road']
            },
            geometry: {
                type: 'MultiPoint',
                // '' is a synonym of 9th Street Northwest, hence have the same coordinates
                coordinates: [[0,2], [0,1], [0,3], [0,4]]
            }
        };
        queueFeature(conf.address, address, t.end);
    });

    // regular address point that has and in the name
    tape('index address', (t) => {
        const address = {
            id:5,
            properties: {
                'carmen:text': 'X place and Y place',
                'carmen:center': [0,0],
                'carmen:addressnumber': []
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,0]]
            }
        };
        queueFeature(conf.address, address, t.end);
    });

    tape('index address GeometryCollection', (t) => {
        const address =
        {
            id: 6,
            properties: {
                'carmen:text': 'Main Street Northwest',
                'carmen:addressnumber': [[1, 2, 3], null, null],
                'carmen:intersections': [null,['1st Avenue', '2nd Avenue', '3rd Avenue'], null],
                'carmen:rangetype': 'tiger',
                'carmen:parityl': [[], [], []],
                'carmen:parityr': [[], [], []],
                'carmen:lfromhn': [[], [], []],
                'carmen:rfromhn': [[], [], []],
                'carmen:ltohn': [[], [], []],
                'carmen:rtohn': [[], [], []]
            },
            geometry: {
                type: 'GeometryCollection',
                geometries: [{
                    type: 'MultiPoint',
                    coordinates: [[1,1], [2,2], [3,3]]
                },{
                    type: 'MultiPoint',
                    coordinates: [[2,2], [3,2], [3,3]]
                },{
                    type: 'MultiLineString',
                    coordinates: [[[1,1], [2,2], [3,3]]]
                }]
            }
        };
        queueFeature(conf.address, address, t.end);
    });

    tape('build queued features', (t) => {
        const q = queue();
        Object.keys(conf).forEach((c) => {
            q.defer((cb) => {
                buildQueued(conf[c], cb);
            });
        });
        q.awaitAll(t.end);
    });

    tape('Searching for the street - 9th street northwest', (t) => {
        c.geocode('9th street northwest', {}, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.features[0].place_name, '9th Street Northwest', 'Returns street before intersection point');
            t.deepEquals(res.features[0].center, [0,0], 'Returns the right street center');
            t.end();
        });
    });

    tape('Searching for the intersections only after and is typed - F street northwest', (t) => {
        c.geocode('F street northwest', {}, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.features[0].place_name, 'F Street Northwest', 'Returns street before intersection point');
            t.deepEquals(res.features[0].center, [0,1], 'Returns the right street center');
            t.end();
        });
    });

    tape('Searching for 500 9th street northwest', (t) => {
        c.geocode('500 9th street northwest', {}, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.features[0].place_name, '500 9th Street Northwest', '500 9th Street Northwest');
            t.deepEquals(res.features[0].geometry, { type: 'Point', coordinates: [0,0] }, 'Returns the correct geometry for an addressnumber query');
            t.end();
        });
    });


    tape('Searching for the intersection - F street northwest and 9th street northwest', (t) => {
        c.geocode('F Street Northwest and 9th Street Northwest', {}, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.features[0].place_name, 'F Street Northwest and 9th Street Northwest', 'F Street Northwest and 9th Street Northwest');
            t.deepEquals(res.features[0].geometry, {
                type: 'Point',
                coordinates: [0,2],
                intersection: true
            }, 'Returns the correct geometry for F Street Northwest and 9th Street Northwest');
            t.end();
        });
    });

    tape('Searching for the intersection - F Street Northwest and Huckleberry Finn Road (9th Street Northwest synonym)', (t) => {
        c.geocode('F Street Northwest and Huckleberry Finn Road', {}, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.features[0].place_name, 'F Street Northwest and Huckleberry Finn Road', 'F Street Northwest and Huckleberry Finn Road');
            t.deepEquals(res.features[0].geometry, {
                type: 'Point',
                coordinates: [0,2],
                intersection: true
            }, 'Returns the correct geometry for F Street Northwest and Huckleberry Finn Road');
            t.end();
        });
    });

    tape('Searching for the intersection - F Street Northwest and US HWY 1 (9th Street Northwest synonym)', (t) => {
        c.geocode('F Street Northwest and US HWY 1', {}, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.features[0].place_name, 'F Street Northwest and US HWY 1', 'F Street Northwest and US HWY 1');
            t.deepEquals(res.features[0].geometry, {
                type: 'Point',
                coordinates: [0,2],
                intersection: true
            }, 'Returns the correct geometry for F Street Northwest and US HWY 1');
            t.end();
        });
    });

    tape('Searching for the intersection - Highway Number 4 and Highway Number 6', (t) => {
        c.geocode('Highway Number 4 and Highway Number 6', {}, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.features[0].place_name, 'Highway Number 4 and Highway Number 6', 'Highway Number 4 and Highway Number 6');
            t.deepEquals(res.features[0].geometry, {
                type: 'Point',
                coordinates: [0,2],
                intersection: true
            }, 'Returns the correct geometry for Highway Number 4 and Highway Number 6');
            t.end();
        });
    });

    tape('Searching for the intersection - 9th street northwest and F street northwest', (t) => {
        c.geocode('9th Street Northwest and f street northwest', {}, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.features[0].place_name, '9th Street Northwest and F Street Northwest', '9th street northwest and F street northwest');
            t.deepEquals(res.features[0].geometry, {
                type: 'Point',
                coordinates: [0,2],
                intersection: true
            }, 'Returns the correct geometry for 9th street northwest and F street northwest');
            t.end();
        });
    });

    tape('X place and Y place', (t) => {
        c.geocode('X place and Y place', {}, (err, res) => {
            t.deepEquals(res.features[0].place_name, 'X place and Y place', 'X place and Y place');
            t.deepEquals(res.features[0].center, [0,0], 'X place and Y place');
            t.ifError(err);
            t.end();
        });
    });

    tape('Searching for the intersection - 9th st nw and F st nw', (t) => {
        c.geocode('9th st nw and F st nw', {}, (err, res) => {
            t.deepEquals(res.features[0].place_name, '9th Street Northwest and F Street Northwest', '9th st nw and F st nw');
            t.deepEquals(res.features[0].geometry, {
                type: 'Point',
                coordinates: [0,2],
                intersection: true
            }, 'Returns the correct geometry for 9th Street Northwest and F Street Northwest');
            t.end();
        });
    });

    tape('Searching for the intersection - 9th st nw and F s', (t) => {
        c.geocode('9th st nw and F s', {}, (err, res) => {
            t.deepEquals(res.features[0].place_name, '9th Street Northwest and F Street Northwest', '9th st nw and F s');
            t.deepEquals(res.features[0].geometry, {
                type: 'Point',
                coordinates: [0,2],
                intersection: true
            }, 'Returns the correct geometry for 9th Street Northwest and F Street Northwest');
            t.end();
        });
    });

    tape('Searching for the intersection - 9th st nw and F', (t) => {
        c.geocode('9th st nw and F', {}, (err, res) => {
            t.deepEquals(res.features[0].place_name, '9th Street Northwest and F Street Northwest', '9th st nw and F, returns 9th Street Northwest and F Street Northwest');
            t.deepEquals(res.features[0].center, [0,2], 'Returns the correct geometry for 9th Street Northwest and F Street Northwest');
            t.end();
        });
    });

    tape('Searching for the intersection - F st nw and 9th st', (t) => {
        c.geocode('F st nw and 9th st', {}, (err, res) => {
            t.deepEquals(res.features[0].place_name, 'F Street Northwest and 9th Street Northwest', 'F st nw and 9th st');
            t.deepEquals(res.features[0].geometry, {
                type: 'Point',
                coordinates: [0,2],
                intersection: true
            }, 'Returns the correct geometry for F Street Northwest and 9th Street Northwest');
            t.end();
        });
    });

    tape('Searching for the intersection - 1st and Main Street Northwest', (t) => {
        c.geocode('1st and Main Street Northwest', {}, (err, res) => {
            t.deepEquals(res.features[0].place_name, 'Main Street Northwest', '1st and Main Street Northwest returns Main Street Northwest');
            t.deepEquals(res.features[0].center,  [2,2], 'retruns the correct center for Main Street Northwest');
            t.end();
        });
    });

    tape('Searching for the intersection - F st nw and 9th (should favour returning the street over the intersection)', (t) => {
        c.geocode('F st nw and 9th', {}, (err, res) => {
            t.deepEquals(res.features[0].place_name, 'F Street Northwest and 9th Street Northwest', 'F st nw and 9th');
            t.deepEquals(res.features[0].geometry, {
                type: 'Point',
                coordinates: [0,2],
                intersection: true
            }, 'Returns the correct geometry for F st nw and 9th');
            t.end();
        });
    });

    tape('Searching for the intersection - synonyms', (t) => {
        c.geocode('Frosted Flakes Avenue and F Street Northwest', {}, (err, res) => {
            t.deepEquals(res.features[0].place_name, 'Frosted Flakes Avenue and F Street Northwest', 'Frosted flakes avenue and F street northwest');
            t.deepEquals(res.features[0].geometry, {
                type: 'Point',
                coordinates: [0,1],
                intersection: true
            }, 'Returns the correct geometry for Frosted flakes avenue and F street northwest');
            t.end();
        });
    });

    tape('Searching for the intersection - synonyms', (t) => {
        c.geocode('Frosted Flakes Avenue and F Stre', {}, (err, res) => {
            t.deepEquals(res.features[0].place_name, 'Frosted Flakes Avenue and F Street Northwest', 'Frosted flakes avenue and F street northwest');
            t.deepEquals(res.features[0].geometry, {
                type: 'Point',
                coordinates: [0,1],
                intersection: true
            }, 'Returns the correct geometry for Frosted flakes avenue and F street northwest');
            t.end();
        });
    });

    tape('Returns the correct result when intersections have an and - Abercrombie and Fitch Avenue and F Street Northwest', (t) => {
        c.geocode('Abercrombie and Fitch Avenue and F Street Northwest', {}, (err, res) => {
            t.deepEquals(res.features[0].place_name, 'Abercrombie and Fitch Avenue and F Street Northwest', 'Abercrombie and Fitch Avenue and F Street Northwest');
            t.deepEquals(res.features[0].geometry, {
                type: 'Point',
                coordinates: [0,3],
                intersection: true
            }, 'Returns the correct geometry for Abercrombie and Fitch Avenue and F Street Northwest');
            t.end();
        });
    });

    tape('intersections in a combined GeomteryCollection', (t) => {
        c.geocode('1st Avenue and Main Street Northwest', {}, (err, res) => {
            t.deepEquals(res.features[0].place_name, '1st Avenue and Main Street Northwest', ' 1st Avenue and Main Street Northwest');
            t.deepEquals(res.features[0].geometry, {
                type: 'Point',
                coordinates: [2,2],
                intersection: true
            }, 'Returns the correct geometry for 1st Avenue and Main Street Northwest');
            t.end();
        });
    });

    tape('intersections in a combined GeomteryCollection', (t) => {
        c.geocode('2nd Avenue and Main Street Northwest', {}, (err, res) => {
            t.deepEquals(res.features[0].place_name, '2nd Avenue and Main Street Northwest', '2nd Avenue and Main Street Northwest');
            t.deepEquals(res.features[0].geometry, {
                type: 'Point',
                coordinates: [3,2],
                intersection: true
            }, 'Returns the correct geometry for 2nd Avenue and Main Street Northwest');
            t.end();
        });
    });

    tape('intersections in a combined GeomteryCollection', (t) => {
        c.geocode('3rd Avenue and Main Street Northwest', {}, (err, res) => {
            t.deepEquals(res.features[0].place_name, '3rd Avenue and Main Street Northwest', '3rd Avenue and Main Street Northwest');
            t.deepEquals(res.features[0].geometry, {
                type: 'Point',
                coordinates: [3,3],
                intersection: true
            }, 'Returns the correct geometry for 3rd Avenue and Main Street Northwest');
            t.end();
        });
    });

    tape('Addressnumber in a combined GeomteryCollection', (t) => {
        c.geocode('1 Main Street Northwest', {}, (err, res) => {
            t.deepEquals(res.features[0].place_name, '1 Main Street Northwest', '1 Main Street Northwest');
            t.deepEquals(res.features[0].geometry, {
                type: 'Point',
                coordinates: [1,1],
            }, 'Returns the correct geometry for 1 Main Street Northwest');
            t.end();
        });
    });
})();

(() => {
    const conf = {
        address: new mem({
            maxzoom: 14,
            geocoder_address: 1,
            geocoder_tokens: {
                street: 'st',
                northwest: 'nw',
                road: 'rd',
                '(.+) & (.+)': {
                    regex: true,
                    spanBoundaries: 1,
                    text: '$1 and $2'
                }
            },
            geocoder_intersection_token: 'and',
            geocoder_format: '{address._number} {address._name}{locality._name}, {place._name}, {region._name} {postcode._name}, {country._name}'
        }, () => {})
    };

    const c = new Carmen(conf);

    // intersection address data
    tape('index address', (t) => {
        const address = {
            id:2,
            properties: {
                // Synonyms of the feature go in 'carmen:text'
                'carmen:text': 'Highway Number 6,Huckleberry Finn Road,9th Street Northwest,US HWY 1',
                'carmen:center': [0,0],
                // intersections with the feature go here
                'carmen:intersections': ['F Street Northwest', 'Highway Number 4', 'Highway Number 2']
            },
            geometry: {
                type: 'MultiPoint',
                // coordinates correspond to the street in 'carmen:intersection'
                // for example, F Street Northwest and 9th Street Northwest intersect at [0,2]
                coordinates: [[0,2], [0,2], [0,1]]
            }
        };
        queueFeature(conf.address, address, t.end);
    });

    tape('build queued features', (t) => {
        const q = queue();
        Object.keys(conf).forEach((c) => {
            q.defer((cb) => {
                buildQueued(conf[c], cb);
            });
        });
        q.awaitAll(t.end);
    });

    tape('Searching for the intersection - F st nw & 9th st nw', (t) => {
        c.geocode('F st nw & 9th st nw', {}, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.features[0].place_name, 'F Street Northwest and 9th Street Northwest', 'F Street Northwest and 9th Street Northwest');
            t.deepEquals(res.features[0].geometry, {
                type: 'Point',
                coordinates: [0,2],
                intersection: true
            }, 'Returns the correct geometry for F st nw & 9th st nw');
            t.end();
        });
    });
})();

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
