var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('d3-queue').queue;
var addFeature = require('../lib/util/addfeature');
var unidecode = require('unidecode-cxx');
var token = require('../lib/util/token');

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

tape('japan token', function(t) {
    var tokens = token.createReplacer({ 
        "(.*?)1丁目(.*?)": "$1 一丁目 $2",
        "(.*?)2丁目(.*?)": "$1 二丁目 $2",
        "(.*?)3丁目(.*?)": "$1 三丁目 $2",
        "(.*?)4丁目(.*?)": "$1 四丁目 $2",
        "(.*?)5丁目(.*?)": "$1 五丁目 $2",
        "(.*?)6丁目(.*?)": "$1 六丁目 $2",
        "(.*?)7丁目(.*?)": "$1 七丁目 $2",
        "(.*?)8丁目(.*?)": "$1 八丁目 $2",
        "(.*?)9丁目(.*?)": "$1 九丁目 $2",
        "(.*?)10丁目(.*?)": "$1 十丁目 $2",
        "^(.*?)([0-9]+)-([0-9]+)(.*)$": "$2 $1$4$5"
    });
    var city1 = "本城町2丁目26-1 下妻市 日本";
    var city2 = "乙1673-13 安芸郡 奈半利町 日本"
    var city3 = "上清戸2丁目14-2 清瀬市 日本"
    c.geocode(city3, null, function(err, res) {
        t.assert(res.query.indexOf('14') > -1, "numbers aren't split");
    });
    t.deepEqual(token.replaceToken(tokens, city1),'26 本城町 二丁目  下妻市 日本');
    t.deepEqual(token.replaceToken(tokens, city2),'1673 乙 安芸郡 奈半利町 日本');
    t.end();
});


tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});

