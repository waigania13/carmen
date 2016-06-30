var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('d3-queue').queue;
var addFeature = require('../lib/util/addfeature');
var unidecode = require('unidecode-cxx');
var token = require('../lib/util/token');
var termops = require('../lib/util/termops');

var conf = {
    country: new mem(null, function() {}),
    region: new mem(null, function() {}),
    district: new mem(null, function() {}),
    place: new mem(null, function() {}),
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

tape('index region', function(t) {
    var region = {
        id:1,
        properties: {
            'carmen:text':'三重県',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.region, region, t.end);
});
tape('index region', function(t) {
    var region = {
        id:2,
        properties: {
            'carmen:text':'鹿児島県',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.region, region, t.end);
});
tape('index district 1', function(t) {
    var district = {
        id:1,
        properties: {
            'carmen:text':'大島郡',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.district, district, t.end);
});
tape('index place 1', function(t) {
    var place = {
        id:1,
        properties: {
            'carmen:text':'度会郡',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.place, place, t.end);
});
tape('index place 2', function(t) {
    var place = {
        id:2,
        properties: {
            'carmen:text':'玉城町',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.place, place, t.end);
});

tape('index place 3', function(t) {
    var place = {
        id:3,
        properties: {
            'carmen:text':'郡',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.place, place, t.end);
});

tape('index place 4', function(t) {
    var place = {
        id:4,
        properties: {
            'carmen:text':'度会',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.place, place, t.end);
});

tape('index place 5', function(t) {
    var place = {
        id:5,
        properties: {
            'carmen:text':'勝田',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.place, place, t.end);
});
tape('index place 6', function(t) {
    var place = {
        id:6,
        properties: {
            'carmen:text':'龍郷町',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.place, place, t.end);
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
tape('index address 7', function(t) {
    var address = {
        id:7,
        properties: {
            'carmen:text':'瀬留',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0],
            'carmen:addressnumber': ['123', '466', '500']
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
        t.end()
    });
});
tape('Check order of query', function(t) {
    c.geocode('466 瀬留龍郷町大島郡', { debug: true}, function(err, res) {
        t.ifError(err);
        t.equal(res.features.length, 2, "466 瀬留龍郷町大島郡");
    });
    c.geocode('大島郡龍郷町瀬留466', { debug: true}, function(err, res) {
        t.ifError(err);
        t.equal(res.features.length, 0, "大島郡龍郷町瀬留466");
        t.end();
    });
});

tape('japan token', function(t) {
    var globals = token.createReplacer({
        "^(?=[\u1100-\u11FF\u2E80-\u2EFF\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\u3100-\u312F\u3130-\u318F\u31C0-\u31EF\u31F0-\u31FF\u3200-\u32FF\u3300-\u33FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uFE30-\uFE4F]+)(.*?)([0-9]+)-([0-9]+)(.*)$": "$1$4$5 $2"
    });
    var tokens = token.createReplacer({ 
        "[１1]丁目": "一丁目",
        "[２2]丁目": "二丁目",
        "[３3]丁目": "三丁目",
        "[４4]丁目": "四丁目",
        "[５5]丁目": "五丁目",
        "[６6]丁目": "六丁目",
        "[７7]丁目": "七丁目",
        "[８8]丁目": "八丁目",
        "[９9]丁目": "九丁目",
        "(１０|10)丁目": "十丁目"
    });
    var cities = [
        ["本城町2丁目26-1 下妻市", "本城町二丁目 下妻市 26"],
        ["乙1673-13 安芸郡 奈半利町", "乙 安芸郡 奈半利町 1673"],
        ["中津川市馬籠4571-1", "中津川市馬籠 4571"],
        ["中津川市馬籠4571", "中津川市馬籠4571"]
    ]
    c.geocode(cities[3][0], null, function(err, res) {
        t.assert(res.query.indexOf('4571') > -1, "numbers aren't split");
    });
    cities.forEach(function(item){
        city = token.replaceToken(globals, item[0]);
        t.deepEqual(token.replaceToken(tokens, city),item[1]);
    });
    t.end();
});

tape("termops", function(t) {
    var query = termops.tokenize('羽村市神明台3丁目5');
    var num = termops.numTokenize(query);
    num.forEach(function(num) {
        var perms = [];
        perms.push(termops.permutations(num));
    });
    t.end();
})


tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});

