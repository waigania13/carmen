module.exports = function(results, address) {
    if (!results || !results.length) return;
    for (var i = 0, l = results.length; i < l; i++) {

        var res = results[i];

        // features without address data at all, on either side of the street
        if (!res.geom) continue;

        var lfromhn = parseSemiNumber(res.lfromhn),
            rfromhn = parseSemiNumber(res.rfromhn),
            ltohn = parseSemiNumber(res.ltohn),
            rtohn = parseSemiNumber(res.rtohn);

        // no usable data at all
        if ([lfromhn, rfromhn, ltohn, rtohn].every(falsy)) {
            continue;
        }

        var start, end, side;

        // if both sides of the street have addresses, choose right even/odd
        // part of the street
        if (typeof lfromhn === 'number' && typeof rfromhn === 'number') {
            if (address % 2 == lfromhn % 2) {
                start = lfromhn;
                end = ltohn;
                side = 'left';
            } else {
                start = rfromhn;
                end = rtohn;
                side = 'right';
            }
        } else if (typeof lfromhn === 'number') {
            start = lfromhn;
            end = ltohn;
            side = 'left';
        } else if (typeof rfromhn === 'number') {
            start = rfromhn;
            end = rtohn;
            side = 'right';
        } else {
            continue;
        }

        var min = Math.min(start, end),
            max = Math.max(start, end);

        // addresses outside of the range
        if (address < min || address > max) continue;

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
        var geom = JSON.parse(results[i].geom);
        var coords = geom.coordinates;

        if (reverse) coords.reverse();

        var distance = calculateDistance(coords);
        var unnorm = part * distance;

        for (var stop = 1; stop < coords.length - 1; stop++) {
            if (coords[stop][2] > unnorm) break;
        }

        var interp = (unnorm - coords[stop - 1][2]) /
            (coords[stop][2] - coords[stop - 1][2]);

        var mid = [
            coords[stop][0] * interp + coords[stop - 1][0] * (1 - interp),
            coords[stop][1] * interp + coords[stop - 1][1] * (1 - interp)];

        results[i].address_point = mid;
    }
};

function calculateDistance(coords) {
    var a, b, distance = 0;
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
    _ = parseInt((_ || '').replace(/[^\d]/g, 10));
    return isNaN(_) ? null : _;
}

function falsy(_) { return !_; }
