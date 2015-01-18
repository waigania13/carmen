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

    // Store the nearest endpoint during iteration over lines.
    // The nearest endpoint is used for any addresses that do
    // not have strict or loose range matches and fall within
    // a given threshold (e.g. within 400 housnums of the address).
    var nearest = {hn:Infinity,pt:null};

    for (var i = 0; i < lines.length; i++) {
        var lfromhn = parseSemiNumber(lf[i]),
            rfromhn = parseSemiNumber(rf[i]),
            ltohn = parseSemiNumber(lt[i]),
            rtohn = parseSemiNumber(rt[i]),
            parityl = lp[i] || '',
            parityr = rp[i] || '';
        
        // no usable data at all
        if ([lfromhn, rfromhn, ltohn, rtohn].every(falsy)) continue;
        
        var paritymask = (address % 2) === 0 ? E : O;

        // strict L match
        if (typeof lfromhn === 'number' &&
            address >= Math.min(lfromhn,ltohn) &&
            address <= Math.max(lfromhn,ltohn) &&
            paritymask[parityl]) {
            return setPoint(address, lfromhn, ltohn, lines[i].slice(0));
        // strict R match
        } else if (typeof rfromhn === 'number' &&
            address >= Math.min(rfromhn,rtohn) &&
            address <= Math.max(rfromhn,rtohn) &&
            paritymask[parityr]) {
            return setPoint(address, rfromhn, rtohn, lines[i].slice(0));
        // loose L match (no parity check)
        } else if (typeof lfromhn === 'number' &&
            address >= Math.min(lfromhn,ltohn) &&
            address <= Math.max(lfromhn,ltohn)) {
            return setPoint(address, lfromhn, ltohn, lines[i].slice(0), true);
        // loose R match (no parity check)
        } else if (typeof rfromhn === 'number' &&
            address >= Math.min(rfromhn,rtohn) &&
            address <= Math.max(rfromhn,rtohn)) {
            return setPoint(address, rfromhn, rtohn, lines[i].slice(0), true);
        // no range match, store line endpoint if closest so far
        } else {
            var hns = [lfromhn, ltohn, rfromhn, rtohn];
            for (var j = 0; j < 4; j++) {
                if (typeof hns[j] !== 'number') continue;
                if (Math.abs(address - nearest.hn) < Math.abs(address - hns[j])) continue;
                nearest.hn = hns[j];
                nearest.pt = j % 2 === 0 ? lines[i][0] : lines[i][1];
            }
            continue;
        }
    }

    // If the nearest line endpoint falls within our
    // threshold use it as a fallback.
    if (Math.abs(address - nearest.hn) <= 400) {
        return setPoint(address, nearest.hn, nearest.hn, [nearest.pt.slice(0), nearest.pt.slice(0)], true);
    }
};

function setPoint(address, start, end, coords, omitted) {
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

    if (reverse) coords.reverse();

    var distance = calculateDistance(coords);
    var unnorm = part * distance;

    for (var stop = 1; stop < coords.length - 1; stop++) {
        if (coords[stop][2] > unnorm) break;
    }

    var range = coords[stop][2] - coords[stop - 1][2];
    var interp = range ? (unnorm - coords[stop - 1][2]) / range : 1;

    var geom = {
        type:'Point',
        coordinates: [
            coords[stop][0] * interp + coords[stop - 1][0] * (1 - interp),
            coords[stop][1] * interp + coords[stop - 1][1] * (1 - interp)
        ].map(function(v) {
            return Math.round(v*1e6) / 1e6;
        })
    };
    if (omitted) geom.omitted = true;
    return geom;
}

module.exports.setPoint = setPoint;
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
