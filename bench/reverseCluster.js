var Benchmark = require('benchmark'),
    suite = new Benchmark.Suite();
var addressCluster = require('../lib/pure/addresscluster');

var bytes = require('bytes');

console.log(bytes(process.memoryUsage().rss));


console.time('Reversing Address Cluster');
addressCluster.reverse(
    {
        _text: "Main Street West",
        _cluster: {
            1: { type: "Point", coordinates: [-66.053609778369008,45.267755774710196] },
            3: { type: "Point", coordinates: [-66.053520444159631,45.267773417263989] },
            5: { type: "Point", coordinates: [-66.053545143362001,45.267872489876673] },
            7: { type: "Point", coordinates: [-66.05356242929092,45.267942290574915] },
            9: { type: "Point", coordinates: [-66.051152143296363,45.267157137887125] },
            11: { type: "Point", coordinates: [-66.053862373147226,45.267717632055017] },
            13: { type: "Point", coordinates: [-66.053613494258471,45.26809095484226] },
            15: { type: "Point", coordinates: [-66.054202319089583,45.267831895089252] },
            17: { type: "Point", coordinates: [-66.054340252560081,45.267630439181438] },
            19: { type: "Point", coordinates: [-66.055423355486255,45.267465098064818] },
            21: { type: "Point", coordinates: [-66.055636548756354,45.267575708862665] },
            23: { type: "Point", coordinates: [-66.05578708432769,45.267552906584683] },
            25: { type: "Point", coordinates: [-66.055941513163489,45.267521121675216] },
            27: { type: "Point", coordinates: [-66.056094603876147,45.267497429255343] },
            29: { type: "Point", coordinates: [-66.056246391959618,45.267477330605146] },
            31: { type: "Point", coordinates: [-66.056403358026344,45.267446904687787] },
            33: { type: "Point", coordinates: [-66.056557736665013,45.267421417151049] },
            35: { type: "Point", coordinates: [-66.056694988345427,45.267386414604864] },
            37: { type: "Point", coordinates: [-66.057019554634124,45.267269367186401] },
            39: { type: "Point", coordinates: [-66.057029425003947,45.26714838641995] }

        },
        _geometry: { text: "MultiPoint Here" }
    }, [1,3]);
console.timeEnd('Reversing Address Cluster');
console.log(bytes(process.memoryUsage().rss));
