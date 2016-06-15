var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('d3-queue').queue;
var addFeature = require('../lib/util/addfeature');

var conf = {
    country: new mem(null, function() {}),
    province: new mem(null, function() {}),
    city: new mem(null, function() {}),
    address: new mem({maxzoom: 6, geocoder_address: 1}, function() {})
};
var c = new Carmen(conf);

tape('index country', function(t) {
    var country = {
        id:1,
        properties: {
            'carmen:text':'Japan',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.country, country, t.end);
});

tape('index province', function(t) {
    var province = {
        id:1,
        properties: {
            'carmen:text':'三重県',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.province, province, t.end);
});
tape('index city 1', function(t) {
    var city = {
        id:1,
        properties: {
            'carmen:text':'度会郡',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.city, city, t.end);
});
tape('index city 2', function(t) {
    var city = {
        id:2,
        properties: {
            'carmen:text':'玉城町',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.city, city, t.end);
});

tape('index city 3', function(t) {
    var city = {
        id:3,
        properties: {
            'carmen:text':'郡',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.city, city, t.end);
});

tape('index city 4', function(t) {
    var city = {
        id:4,
        properties: {
            'carmen:text':'度会',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.city, city, t.end);
});

tape('index city 5', function(t) {
    var city = {
        id:5,
        properties: {
            'carmen:text':'勝田',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.city, city, t.end);
});

tape('index address 1', function(t) {
    var address = {
        id:1,
        properties: {
            'carmen:text':'勝田',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0],
            'carmen:addressnumber': ['3591']
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [[0,0],[0,0],[0,0]]
        }
    };
    addFeature(conf.address, address, t.end);
});
tape('index address 2', function(t) {
    var address = {
        id:2,
        properties: {
            'carmen:text':'勝田',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0],
            'carmen:addressnumber': ['4433']
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [[0,0],[0,0],[0,0]]
        }
    };
    addFeature(conf.address, address, t.end);
});
tape('index address 3', function(t) {
    var address = {
        id:3,
        properties: {
            'carmen:text':'勝',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0],
            'carmen:addressnumber': ['3591']
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [[0,0],[0,0],[0,0]]
        }
    };
    addFeature(conf.address, address, t.end);
});
tape('index address 4', function(t) {
    var address = {
        id:4,
        properties: {
            'carmen:text':'田',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0],
            'carmen:addressnumber': ['3591']
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [[0,0],[0,0],[0,0]]
        }
    };
    addFeature(conf.address, address, t.end);
});
tape('index address 5', function(t) {
    var address = {
        id:5,
        properties: {
            'carmen:text':'度',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0],
            'carmen:addressnumber': ['3591']
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [[0,0],[0,0],[0,0]]
        }
    };
    addFeature(conf.address, address, t.end);
});
tape('index address 6', function(t) {
    var address = {
        id:6,
        properties: {
            'carmen:text':'郡',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0],
            'carmen:addressnumber': ['3591']
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [[0,0],[0,0],[0,0]]
        }
    };
    addFeature(conf.address, address, t.end);
});
tape('Check relevance score', function(t) {
    c.geocode('3591 勝田度会郡', { debug: true}, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].relevance, (1));
        
    });
    c.geocode('4433 勝田度会郡', null, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].relevance, 1);
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});

