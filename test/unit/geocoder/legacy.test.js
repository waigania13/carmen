'use strict';
const tape = require('tape');
const Carmen = require('../../..');
const mem = require('../../../lib/sources/api-mem');
const { queueFeature, buildQueued } = require('../../../lib/indexer/addfeature');

tape('legacy version (pre-v1 => ok)', (t) => {
    const conf = {
        test: new mem({ maxzoom: 6, geocoder_version: null }, () => {})
    };
    const c = new Carmen(conf);
    queueFeature(conf.test, {
        id:1,
        properties: {
            'carmen:text':'illinois',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    }, () => {
        buildQueued(conf.test, () => {
            c.geocode('test', {}, (err, res) => {
                t.ifError(err);
                t.equal(res.features.length, 0);
                t.end();
            });
        });
    });
});

tape('legacy version (v1 => error)', (t) => {
    const conf = {
        test: new mem({ maxzoom: 6, geocoder_version: 1 }, () => {})
    };
    const c = new Carmen(conf);
    queueFeature(conf.test, {
        id:1,
        properties: {
            'carmen:text':'illinois',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    }, () => {
        buildQueued(conf.test, () => {
            c.geocode('test', {}, (err, res) => {
                t.ok(err);
                t.deepEqual(err.toString(), 'Error: geocoder version is not 10, index: test');
                t.end();
            });
        });
    });
});

tape('legacy version (v2 => error)', (t) => {
    const conf = {
        test: new mem({ maxzoom: 6, geocoder_version: 2 }, () => {})
    };
    const c = new Carmen(conf);
    queueFeature(conf.test, {
        id:1,
        properties: {
            'carmen:text':'illinois',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    }, () => {
        buildQueued(conf.test, () => {
            c.geocode('test', {}, (err, res) => {
                t.ok(err);
                t.deepEqual(err.toString(), 'Error: geocoder version is not 10, index: test');
                t.end();
            });
        });
    });
});

tape('legacy version (3 => error)', (t) => {
    const conf = {
        test: new mem({ maxzoom: 6, geocoder_version: 3 }, () => {})
    };
    const c = new Carmen(conf);
    queueFeature(conf.test, {
        id:1,
        properties: {
            'carmen:text':'illinois',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    }, () => {
        buildQueued(conf.test, () => {
            c.geocode('test', {}, (err, res) => {
                t.ok(err);
                t.deepEqual(err.toString(), 'Error: geocoder version is not 10, index: test');
                t.end();
            });
        });
    });
});

tape('legacy version (v4 => error)', (t) => {
    const conf = {
        test: new mem({ maxzoom: 6, geocoder_version: 4 }, () => {})
    };
    const c = new Carmen(conf);
    queueFeature(conf.test, {
        id:1,
        properties: {
            'carmen:text':'illinois',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    }, () => {
        buildQueued(conf.test, () => {
            c.geocode('test', {}, (err, res) => {
                t.ok(err);
                t.deepEqual(err.toString(), 'Error: geocoder version is not 10, index: test');
                t.end();
            });
        });
    });
});

tape('legacy version (v5 => error)', (t) => {
    const conf = {
        test: new mem({ maxzoom: 6, geocoder_version: 5 }, () => {})
    };
    const c = new Carmen(conf);
    queueFeature(conf.test, {
        id:1,
        properties: {
            'carmen:text':'illinois',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    }, () => {
        buildQueued(conf.test, () => {
            c.geocode('test', {}, (err, res) => {
                t.ok(err);
                t.deepEqual(err.toString(), 'Error: geocoder version is not 10, index: test');
                t.end();
            });
        });
    });
});

tape('legacy version (v6 => error)', (t) => {
    const conf = {
        test: new mem({ maxzoom: 6, geocoder_version: 6 }, () => {})
    };
    const c = new Carmen(conf);
    queueFeature(conf.test, {
        id:1,
        properties: {
            'carmen:text':'illinois',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    }, () => {
        buildQueued(conf.test, () => {
            c.geocode('test', {}, (err, res) => {
                t.ok(err);
                t.deepEqual(err.toString(), 'Error: geocoder version is not 10, index: test');
                t.end();
            });
        });
    });
});

tape('legacy version (v7 => error)', (t) => {
    const conf = {
        test: new mem({ maxzoom: 6, geocoder_version: 7 }, () => {})
    };
    const c = new Carmen(conf);
    queueFeature(conf.test, {
        id:1,
        properties: {
            'carmen:text':'illinois',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    }, () => {
        buildQueued(conf.test, () => {
            c.geocode('test', {}, (err, res) => {
                t.ok(err);
                t.deepEqual(err.toString(), 'Error: geocoder version is not 10, index: test');
                t.end();
            });
        });
    });
});
