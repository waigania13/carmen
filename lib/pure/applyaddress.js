var O = { O: true, B: true, '': true };
var E = { E: true, B: true, '': true };

module.exports = function(feature, address) {
    // features without address data at all, on either side of the street
    if (feature._rangetype !== 'tiger' ||
        !feature._geometry ||
        (feature._geometry.type !== 'LineString' &&
        feature._geometry.type !== 'MultiLineString')) return;

    var lines = feature._geometry.type === 'MultiLineString' ?
        feature._geometry.coordinates :
        [feature._geometry.coordinates];

    var lf = Array.isArray(feature._lfromhn) ? feature._lfromhn : feature._lfromhn ? [feature._lfromhn] : [];
    var lt = Array.isArray(feature._ltohn)   ? feature._ltohn : feature._ltohn ? [feature._ltohn] : [];
    var rf = Array.isArray(feature._rfromhn) ? feature._rfromhn : feature._rfromhn ? [feature._rfromhn] : [];
    var rt = Array.isArray(feature._rtohn)   ? feature._rtohn : feature._rtohn ? [feature._rtohn] : [];
    var lp = Array.isArray(feature._parityl) ? feature._parityl : feature._parityl ? [feature._parityl] : [];
    var rp = Array.isArray(feature._parityr) ? feature._parityr : feature._parityr ? [feature._parityr] : [];

    for (var i = 0; i < lines.length; i++) {
        var lfromhn = parseSemiNumber(lf[i]),
            rfromhn = parseSemiNumber(rf[i]),
            ltohn = parseSemiNumber(lt[i]),
            rtohn = parseSemiNumber(rt[i]),
            parityl = lp[i] || '',
            parityr = rp[i] || '';

        // no usable data at all
        if ([lfromhn, rfromhn, ltohn, rtohn].every(falsy)) continue;

        var start, end, side, paritymask;

        paritymask = (address % 2) === 0 ? E : O;

        // check left side
        if (typeof lfromhn === 'number' &&
            address >= Math.min(lfromhn,ltohn) &&
            address <= Math.max(lfromhn,ltohn) &&
            paritymask[parityl]) {
            start = lfromhn;
            end = ltohn;
            side ='left';
        } else if (typeof rfromhn === 'number' &&
            address >= Math.min(rfromhn,rtohn) &&
            address <= Math.max(rfromhn,rtohn) &&
            paritymask[parityr]) {
            start = rfromhn;
            end = rtohn;
            side ='right';
        } else {
            continue;
        }

        var reverse = false;
        if (start > end) {
            reverse = true;
            // swap start and end
            var _;
            _ = end;
            end = start;
            start = _;
        }

        // a normalized number between 0 and 1
        var part = (address - start) / (end - start);
        var coords = lines[i].slice(0);

        if (reverse) coords.reverse();

        var distance = calculateDistance(coords);
        var unnorm = part * distance;

        for (var stop = 1; stop < coords.length - 1; stop++) {
            if (coords[stop][2] > unnorm) break;
        }

        var interp = (unnorm - coords[stop - 1][2]) /
            (coords[stop][2] - coords[stop - 1][2]);

        return {
            type:'Point',
            coordinates: [
                coords[stop][0] * interp + coords[stop - 1][0] * (1 - interp),
                coords[stop][1] * interp + coords[stop - 1][1] * (1 - interp)
            ].map(function(v) {
                return Math.round(v*1e6) / 1e6;
            })
        };
    }
};

module.exports.parseSemiNumber = parseSemiNumber;
module.exports.calculateDistance = calculateDistance;

function calculateDistance(coords) {
    var a, b, distance = 0;
    coords[0].push(distance);
    for (var j = 1; j < coords.length; j++) {
        a = coords[j - 1];
        b = coords[j];
        distance += Math.sqrt(
            ((a[0] - b[0]) * (a[0] - b[0])) +
            ((a[1] - b[1]) * (a[1] - b[1])));
        coords[j].push(distance);
    }
    return distance;
}

function parseSemiNumber(_) {
    _ = parseInt((_ || '').replace(/[^\d]/g,''),10);
    return isNaN(_) ? null : _;
}

function falsy(_) { return !_; }
