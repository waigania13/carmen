turf = {
    distance: require('turf-distance'),
    bearing: require('turf-bearing'),
    destination: require('turf-destination'),
    point: require('turf-point'),
    linestring: require('turf-linestring')
};

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
        if (falsy(lfromhn) && falsy(rfromhn) && falsy(ltohn) && falsy(rtohn)) continue;

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
        return setPoint(address, nearest.hn, nearest.hn, [nearest.pt, nearest.pt], true);
    }
};

module.exports.reverse = function(feat,query) {
    if (feat._rangetype !== "tiger") return feat;
    var potential;

    if (feat._geometry.type === "MultiLineString") {
        for (var i = 0; i < feat._geometry.coordinates.length; i++) {
            var current = getReversePoint(query, feat._geometry.coordinates[i], 'miles');
            if (!potential || current.dist < potential.dist) potential = current;
        }
    } else if (feat._geometry.type ==="LineString") {
        potential = getReversePoint(query, feat._geometry.coordinates);
    } else return feat;

    feat._geometry = potential.pt.geometry;
    return feat;
};

//Accepts pt array and coords array for line.
//ie getReversePoint([1,1], [[0,0], [1,1]])
function getReversePoint(pt, coords, units) {
    var i; //Loop Iterator
    pt = turf.point(pt);
    var closestPt = turf.point([Infinity, Infinity], {
        dist: Infinity
    });

    for (i = 0; i < coords.length - 1; i++) {
        var start = turf.point(coords[i]);
        var stop = turf.point(coords[i + 1]);
        //start
        start.properties.dist = turf.distance(pt, start, units);
        //stop
        stop.properties.dist = turf.distance(pt, stop, units);
        //perpendicular
        var direction = turf.bearing(start, stop);
        var perpendicularPt = turf.destination(pt, 1000, direction + 90, 'miles'); // 10000 = gross
        var intersect = lineIntersects(
            pt.geometry.coordinates[0],
            pt.geometry.coordinates[1],
            perpendicularPt.geometry.coordinates[0],
            perpendicularPt.geometry.coordinates[1],
            start.geometry.coordinates[0],
            start.geometry.coordinates[1],
            stop.geometry.coordinates[0],
            stop.geometry.coordinates[1]
        );
        if (!intersect) {
            perpendicularPt = turf.destination(pt, 1000, direction - 90, 'miles'); // 10000 = gross
            intersect = lineIntersects(
                pt.geometry.coordinates[0],
                pt.geometry.coordinates[1],
                perpendicularPt.geometry.coordinates[0],
                perpendicularPt.geometry.coordinates[1],
                start.geometry.coordinates[0],
                start.geometry.coordinates[1],
                stop.geometry.coordinates[0],
                stop.geometry.coordinates[1]
            );
        }
        perpendicularPt.properties.dist = Infinity;
        var intersectPt;
        if (intersect) {
            intersectPt = turf.point(intersect);
            intersectPt.properties.dist = turf.distance(pt, intersectPt, units);
        }

        if (start.properties.dist < closestPt.properties.dist) closestPt = start;
        if (stop.properties.dist < closestPt.properties.dist) closestPt = stop;
        if (intersectPt && intersectPt.properties.dist < closestPt.properties.dist) closestPt = intersectPt;
        closestPt.properties.index = i;
    }

    var clipLine = turf.linestring([], {});
    for (i = 0; i < closestPt.properties.index + 1; i++) {
        clipLine.geometry.coordinates.push(coords[i]);
    }
    clipLine.geometry.coordinates.push(closestPt.geometry.coordinates);
    clipLine.properties.stroke = '#f00';

    var travelled = 0;
    for (i = 0; i < coords.length - 1; i++) {
        travelled += turf.distance(turf.point(coords[i]), turf.point(coords[i + 1]), units);
    }
    return {
        dist: turf.distance(pt, closestPt, 'miles'),
        route: travelled,
        pt: closestPt
    };
}

// modified from http://jsfiddle.net/justin_c_rounds/Gd2S2/light/
function lineIntersects(line1StartX, line1StartY, line1EndX, line1EndY, line2StartX, line2StartY, line2EndX, line2EndY) {
    // if the lines intersect, the result contains the x and y of the intersection (treating the lines as infinite) and booleans for whether line segment 1 or line segment 2 contain the point
    var denominator, a, b, numerator1, numerator2, result = {
        x: null,
        y: null,
        onLine1: false,
        onLine2: false
    };
    denominator = ((line2EndY - line2StartY) * (line1EndX - line1StartX)) - ((line2EndX - line2StartX) * (line1EndY - line1StartY));
    if (denominator === 0) {
        if (result.x !== null && result.y !== null) {
            return result;
        } else {
            return false;
        }
    }
    a = line1StartY - line2StartY;
    b = line1StartX - line2StartX;
    numerator1 = ((line2EndX - line2StartX) * a) - ((line2EndY - line2StartY) * b);
    numerator2 = ((line1EndX - line1StartX) * a) - ((line1EndY - line1StartY) * b);
    a = numerator1 / denominator;
    b = numerator2 / denominator;

    // if we cast these lines infinitely in both directions, they intersect here:
    result.x = line1StartX + (a * (line1EndX - line1StartX));
    result.y = line1StartY + (a * (line1EndY - line1StartY));

    // if line1 is a segment and line2 is infinite, they intersect if:
    if (a > 0 && a < 1) {
        result.onLine1 = true;
    }
    // if line2 is a segment and line1 is infinite, they intersect if:
    if (b > 0 && b < 1) {
        result.onLine2 = true;
    }
    // if line1 and line2 are segments, they intersect if both of the above are true
    if (result.onLine1 && result.onLine2) {
        return [result.x, result.y];
    } else {
        return false;
    }
}

function setPoint(address, start, end, coords, omitted) {
    // swap start and end, reverse coords
    if (start > end) {
        var _;
        _ = end;
        end = start;
        start = _;
        coords.reverse();
    }

    // a normalized number between 0 and 1
    // if start and end are identical use the starting endpoint (0)
    var part = end - start ? (address - start) / (end - start) : 0;

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
