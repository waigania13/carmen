var assert = require('assert');
var coalesceZooms = require('../lib/pure/coalescezooms');
var ops = require('../lib/util/ops');

describe('coalesce zooms', function() {
    it('zero case', function() {
        var coalesced = coalesceZooms([], [], {}, [], {});
        assert.deepEqual(coalesced, {});
    });
    it('basic coalesce', function() {
        // The data for this test is from the query "holyoke massachusetts"
        // against the province and place indexes.
        var coalesced = coalesceZooms(
        // grids
        [
            [ 83019436130799,
              83019469685231,
              83569191944687,
              83569225499119,
              83569259053551,
              84118947758575,
              84118981313007,
              84119014867439,
              84668703572463,
              84668737126895,
              84668770681327,
              84668804235759,
              85218459386351,
              85218492940783,
              85218526495215,
              85218560049647,
              85768248754671,
              85768282309103,
              85768315863535 ],
            [ 242468150844959,
              242468184399391,
              243017906658847,
              243017940213279,
              273802688856591,
              335376480745316,
              335376514299748,
              335926236559204 ]
        ],
        // feats
        [
            { '495':
               { id: 495,
                 relev: 1,
                 reason: 2,
                 idx: 1,
                 db: 'province',
                 tmpid: 100000000000495 } },
            { '7711':
               { id: 7711,
                 relev: 1,
                 reason: 1,
                 idx: 3,
                 db: 'place',
                 tmpid: 300000000007711 },
              '14180':
               { id: 14180,
                 relev: 1,
                 reason: 1,
                 idx: 3,
                 db: 'place',
                 tmpid: 300000000014180 },
              '131599':
               { id: 131599,
                 relev: 1,
                 reason: 1,
                 idx: 3,
                 db: 'place',
                 tmpid: 300000000131599 } }
        ],
        // types
        [ 'province', 'place' ],
        // zooms
        [ 9, 11 ],
        // indexes (stripped down representation)
        {
            province: { _geocoder: { zoom: 9 } },
            place: { _geocoder: { zoom: 11 } }
        });

        // Reformat encoded zxy's and map full features to just their IDs for
        // easier debugging/assertion of correct results.
        var z, x, y;
        var coalescedCount = {};
        for (var zxy in coalesced) {
            z = Math.floor(zxy/Math.pow(2,28));
            x = Math.floor(zxy/Math.pow(2,14));
            y = zxy % Math.pow(2,14)
            var key = [z,x,y].join('/');
            coalescedCount[key] = coalesced[zxy].map(function(f) { return f.id });
        }
        assert.deepEqual({
            '9/147607/188': [ 495 ],
            '9/147607/189': [ 495 ],
            '9/147608/188': [ 495 ],
            '9/147608/189': [ 495 ],
            '9/147608/190': [ 495 ],
            '9/147609/188': [ 495 ],
            '9/147609/189': [ 495 ],
            '9/147609/190': [ 495 ],
            '9/147610/188': [ 495 ],
            '9/147610/189': [ 495 ],
            '9/147610/190': [ 495 ],
            '9/147610/191': [ 495 ],
            '9/147611/188': [ 495 ],
            '9/147611/189': [ 495 ],
            '9/147611/190': [ 495 ],
            '9/147611/191': [ 495 ],
            '9/147612/189': [ 495 ],
            '9/147612/190': [ 495 ],
            '9/147612/191': [ 495 ],
            '11/180665/770': [ 7711 ],
            '11/180665/771': [ 7711 ],
            '11/180666/770': [ 7711 ],
            '11/180666/771': [ 7711 ],
            '11/180722/724': [ 131599 ],
            '11/180834/758': [ 14180, 495 ],
            '11/180834/759': [ 14180, 495 ],
            '11/180835/758': [ 14180, 495 ]
        }, coalescedCount);
    });
});
