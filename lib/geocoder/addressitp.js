'use strict';
const parseSemiNumber = require('../text-processing/termops').parseSemiNumber;

module.exports.calculateDistance = calculateDistance;
module.exports.parseSemiNumber = parseSemiNumber;
module.exports.getReversePoint = getReversePoint;
module.exports.lineIntersects = lineIntersects;
module.exports.standardize = standardize;
module.exports.matchSide = matchSide;
module.exports.setPoint = setPoint;
module.exports.reverse = reverse;
module.exports.forward = forward;
module.exports.det2D = det2D;
module.exports.sign = sign;

const turf = {
    distance: require('@turf/distance').default,
    bearing: require('@turf/bearing').default,
    destination: require('@turf/destination').default,
    point: require('@turf/helpers').point,
    linestring: require('@turf/helpers').lineString,
    lineDistance: require('@turf/length').default,
    center: require('@turf/center').default
};

const O = { O: true, B: true, '': true };
const E = { E: true, B: true, '': true };

/**
 * Standardize format of address cluster
 * @param {object} feat - GeoJSON feature
 * @param {number} k - index of address range to normalize
 * @return {Array<object>} list of ranges
 */
function standardize(feat, k) {
    const ranges = [];

    // features without address data at all, on either side of the street
    if (k === null || k === undefined || feat.properties['carmen:rangetype'] !== 'tiger' || !feat.geometry || !feat.geometry.geometries || feat.geometry.geometries[k].type !== 'MultiLineString') return ranges;

    const stdFeat = {
        lines: feat.geometry.geometries[k].coordinates,
        lf: feat.properties['carmen:lfromhn'] ? feat.properties['carmen:lfromhn'][k] : [],
        lt: feat.properties['carmen:ltohn'] ? feat.properties['carmen:ltohn'][k] : [],
        rf: feat.properties['carmen:rfromhn'] ? feat.properties['carmen:rfromhn'][k] : [],
        rt: feat.properties['carmen:rtohn'] ? feat.properties['carmen:rtohn'][k] : [],
        lp: feat.properties['carmen:parityl'] ? feat.properties['carmen:parityl'][k] : [],
        rp: feat.properties['carmen:parityr'] ? feat.properties['carmen:parityr'][k] : []
    };
    // convert feature into array of ranges so it can be sorted
    // into a stable-orderd array.
    let i = stdFeat.lines.length;
    while (i--) {
        const f = {
            i: i,
            lf: parseSemiNumber(stdFeat.lf[i] + ''),
            rf: parseSemiNumber(stdFeat.rf[i] + ''),
            lt: parseSemiNumber(stdFeat.lt[i] + ''),
            rt: parseSemiNumber(stdFeat.rt[i] + ''),
            lp: stdFeat.lp[i] || '',
            rp: stdFeat.rp[i] || '',
            lines: stdFeat.lines[i].slice(0)
        };
        ranges.push(f);
    }
    ranges.sort(sortRanges);
    return ranges;
}

/**
 * Sort address ranges in ascending order
 *
 * @param {object} a - address range
 * @param {object} b - address range
 * @return {number} comparison result
 */
function sortRanges(a, b) {
    return (a.lf - b.lf) ||
        (a.rf - b.rf) ||
        (a.lt - b.lt) ||
        (a.rt - b.rt) ||
        (a.lp - b.lp) ||
        (a.rp - b.rp) ||
        (a.lines.length - b.lines.length) ||
        (a.i - b.i);
}

/**
 * Handle forward search address interpolation
 *
 * @param {object} feature - GeoJSON feature
 * @param {string} address - house number
 * @return {object} GeoJSON point geometry
 */
function forward(feat, address) {
    if (!feat.geometry || feat.geometry.type !== 'GeometryCollection') return false;

    address = typeof address === 'string' ? address.replace(/\D/, '') : address;

    // Store the nearest endpoint during iteration over lines.
    // The nearest endpoint is used for any addresses that do
    // not have strict or loose range matches and fall within
    // a given threshold (e.g. within 400 housnums of the address).
    const nearest = { hn:Infinity,pt:null }; // house number, pt is coordinates...?
    let loose = null;

    for (let f_it = 0; f_it < feat.geometry.geometries.length; f_it++) {
        const ranges = standardize(feat, f_it); // generates address number ranges for each of the line segments in the street network
        let i = ranges.length;
        if (!i) continue;

        while (i--) {
            const f = ranges[i];
            if (!f.lf && !f.rf && !f.lt && !f.rt) continue;
            const paritymask = (address % 2) === 0 ? E : O;

            // strict L match
            if (typeof f.lf === 'number' &&
                address >= Math.min(f.lf,f.lt) &&
                address <= Math.max(f.lf,f.lt) &&
                paritymask[f.lp]) {
                feat.geometry = setPoint(address, f.lf, f.lt, f.lines);
                return feat;
            // strict R match
            } else if (typeof f.rf === 'number' &&
                address >= Math.min(f.rf,f.rt) &&
                address <= Math.max(f.rf,f.rt) &&
                paritymask[f.rp]) {
                feat.geometry = setPoint(address, f.rf, f.rt, f.lines);
                return feat;
            // loose L match (no parity check)
            } else if (typeof f.lf === 'number' &&
                address >= Math.min(f.lf,f.lt) &&
                address <= Math.max(f.lf,f.lt)) {
                loose = { from: f.lf, to: f.lt, line: f.lines };
                continue;
            // loose R match (no parity check)
            } else if (typeof f.rf === 'number' &&
                address >= Math.min(f.rf,f.rt) &&
                address <= Math.max(f.rf,f.rt)) {
                loose = { from: f.rf, to: f.rt, line: f.lines };
                continue;
            // no range match, store line endpoint if closest so far
            } else {
                const hns = [f.lf, f.lt, f.rf, f.rt];
                for (let j = 0; j < 4; j++) {
                    if (typeof hns[j] !== 'number') continue;
                    if (Math.abs(address - nearest.hn) < Math.abs(address - hns[j])) continue;
                    nearest.hn = hns[j];
                    nearest.pt = j % 2 === 0 ? f.lines[0] : f.lines[1];
                }
                continue;
            }
        }
    }

    // Prioritize Loose match.
    if (loose) {
        feat.geometry = setPoint(address, loose.from, loose.to, loose.line, true);
        return feat;
    }

    // If the nearest line endpoint falls within our
    // threshold use it as a fallback.
    if (Math.abs(address - nearest.hn) <= 400) {
        feat.geometry = setPoint(address, nearest.hn, nearest.hn, [nearest.pt, nearest.pt], true);
        return feat;
    }
}

/**
 * Handle reverse search address interpolation
 *
 * @param {object} feat - GeoJSON feature
 * @param {Array<numbers>} query - lon, lat
 * @return {object} GeoJSON point geometry
 */
function reverse(feat, query) {
    if (feat.geometry.type !== 'GeometryCollection') return false;
    if (feat.properties['carmen:rangetype'] !== 'tiger') return false;

    let potential;
    let potentialRange;

    for (let f_it = 0; f_it < feat.geometry.geometries.length; f_it++) {
        if (feat.geometry.geometries[f_it].type !== 'MultiLineString') continue;

        const ranges = standardize(feat, f_it);

        let i = ranges.length;
        if (!i) continue;

        // Loop through each coord segment to find shortest distance between seg and query
        while (i--) {
            const currentRange = ranges[i];
            const current = getReversePoint(query, currentRange.lines, {
                units: 'miles'
            });
            if (!potential || current.pt.properties.dist < potential.pt.properties.dist) {
                potential = current;
                potentialRange = currentRange;
            }
        }
    }
    if (!potential) return false;

    // Determine which side of the line the point is on
    const sideBinary = sign(det2D(potential.startLine.geometry.coordinates, potential.endLine.geometry.coordinates, query));
    const leftSideBinary = sign(det2D(
        potential.startLine.geometry.coordinates,
        potential.endLine.geometry.coordinates,
        turf.destination(
            turf.center(turf.linestring([potential.startLine.geometry.coordinates, potential.endLine.geometry.coordinates])),
            0.01,
            turf.bearing(potential.startLine, potential.endLine) - 90,
            { units: 'miles' }).geometry.coordinates));

    let num;
    if (sideBinary === leftSideBinary) { // If point is on the centre
        num = matchSide(potentialRange, 'left', potential);
    } else { // If point is on the right or on the line
        num =  matchSide(potentialRange, 'right', potential);
    }

    feat = JSON.parse(JSON.stringify(feat));

    if (num) feat.properties['carmen:address'] = num;
    feat.geometry = potential.pt.geometry;
    return feat;
}

/**
 * Returns the house number for a given point on an itp line
 *
 * @param {Object} range - address range
 * @param {string} side - "left" or "right"
 * @param {Object} point - center point with index info
 * @param {boolean} strict - if false will check other side of street if data is missing
 * @return {number} Returns housenumber
 */
function matchSide(range, side, point, strict) {
    const opp = (side === 'left') ? 'right' : 'left';
    const sideVar = (side === 'left') ?
        { parity: 'lp',to: 'lt',from: 'lf' } :
        { parity: 'rp',to: 'rt',from: 'rf' };

    // If side x doesn't have data, check the other side
    if (range && !range[sideVar.parity] && !strict) return matchSide(range, opp, point, true);
    if (range && !range[sideVar.parity] && strict) return null;

    const distRatio = point.pt.properties.travelled / point.lineDist;
    const from = parseInt(range[sideVar.from]);
    const to = parseInt(range[sideVar.to]);
    let num = from + (to - from) * distRatio;

    if (range[sideVar.parity] === 'O') {
        num = Math.round((num + 1) / 2) * 2 - 1;
    } else if (range[sideVar.parity] === 'E') {
        num = Math.round(num / 2) * 2;
    } else {
        num = Math.round(num);
    }

    return num;
}

function det2D(start, end, query) { return (end[0] - start[0]) * (query[1] - start[1]) - (end[1] - start[1]) * (query[0] - start[0]); }

/**
 * Determine if a number is less than zero
 * @param {number} num
 * @return {number} -1 if input is less than 0, 1 if 0 or greater. NaN otherwise
 */
function sign(num) { return typeof num === 'number' ? num ? num < 0 ? -1 : 1 : num === num ? 0 : NaN : NaN; }

// Accepts pt array and coords array for line.
// ie getReversePoint([1,1], [[0,0], [1,1]])
function getReversePoint(pt, coords, units) {
    let i; // Loop Iterator
    pt = turf.point(pt);
    let closestPt = turf.point([Infinity, Infinity], {
        dist: Infinity
    });
    let travelled = 0;

    for (i = 0; i < coords.length - 1; i++) {
        const start = turf.point(coords[i]);
        const stop = turf.point(coords[i + 1]);
        // start
        start.properties.dist = turf.distance(pt, start, units);
        // stop
        stop.properties.dist = turf.distance(pt, stop, units);
        // perpendicular
        const direction = turf.bearing(start, stop);
        let perpendicularPt = turf.destination(pt, 1000, direction + 90, { units: 'miles' }); // 10000 = gross
        let intersect = lineIntersects(
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
            perpendicularPt = turf.destination(pt, 1000, direction - 90, { units: 'miles' }); // 10000 = gross
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
        let intersectPt;
        if (intersect) {
            intersectPt = turf.point(intersect);
            intersectPt.properties.dist = turf.distance(pt, intersectPt, units);
        }

        if (start.properties.dist < closestPt.properties.dist) {
            closestPt = start;
            closestPt.properties.travelled = travelled;
        }
        if (stop.properties.dist < closestPt.properties.dist) {
            closestPt = stop;
            closestPt.properties.travelled = travelled + turf.distance(turf.point(coords[i]), stop, units);
        }
        if (intersectPt && intersectPt.properties.dist < closestPt.properties.dist) {
            closestPt = intersectPt;
            closestPt.properties.travelled = travelled + turf.distance(turf.point(coords[i]), intersectPt, units);
        }

        closestPt.properties.index = i;
        travelled += turf.distance(turf.point(coords[i]), turf.point(coords[i + 1]), units);
    }

    return {
        lineDist: turf.lineDistance(turf.linestring(coords), { units: 'miles' }),
        pt: closestPt,
        startLine: turf.point(coords[closestPt.properties.index]),
        endLine: turf.point(coords[closestPt.properties.index + 1])
    };
}

// modified from http://jsfiddle.net/justin_c_rounds/Gd2S2/light/
function lineIntersects(line1StartX, line1StartY, line1EndX, line1EndY, line2StartX, line2StartY, line2EndX, line2EndY) {
    // if the lines intersect, the result contains the x and y of the intersection (treating the lines as infinite) and booleans for whether line segment 1 or line segment 2 contain the point
    const result = {
        x: null,
        y: null,
        onLine1: false,
        onLine2: false
    };
    const denominator = ((line2EndY - line2StartY) * (line1EndX - line1StartX)) - ((line2EndX - line2StartX) * (line1EndY - line1StartY));
    if (denominator === 0) {
        if (result.x !== null && result.y !== null) {
            return result;
        } else {
            return false;
        }
    }
    const diffStartY = line1StartY - line2StartY;
    const diffStartX = line1StartX - line2StartX;
    const numerator1 = ((line2EndX - line2StartX) * diffStartY) - ((line2EndY - line2StartY) * diffStartX);
    const numerator2 = ((line1EndX - line1StartX) * diffStartY) - ((line1EndY - line1StartY) * diffStartX);
    const a = numerator1 / denominator;
    const b = numerator2 / denominator;

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

/**
 * TODO
 * @param {number} address - TODO
 * @param {number} start - TODO
 * @param {number} end - TODO
 * @param {Array<number>} coords - TODO
 * @param {boolean} omitted - TODO
 * @return {object} GeoJSON point geometry
 */
function setPoint(address, start, end, coords, omitted) {
    // swap start and end, reverse coords
    if (start > end) {
        const _ = end;
        end = start;
        start = _;
        coords.reverse();
    }

    // a normalized number between 0 and 1
    // if start and end are identical use the starting endpoint (0)
    const part = end - start ? (address - start) / (end - start) : 0;

    const distance = calculateDistance(coords);
    const unnorm = part * distance;

    let stop;
    for (stop = 1; stop < coords.length - 1; stop++) {
        if (coords[stop][2] > unnorm) break;
    }

    const range = coords[stop][2] - coords[stop - 1][2];
    const interp = range ? (unnorm - coords[stop - 1][2]) / range : 1;

    const geom = {
        type:'Point',
        coordinates: [
            coords[stop][0] * interp + coords[stop - 1][0] * (1 - interp),
            coords[stop][1] * interp + coords[stop - 1][1] * (1 - interp)
        ].map((v) => {
            return Math.round(v * 1e6) / 1e6;
        }),
        interpolated: true
    };
    if (omitted) geom.omitted = true;

    return geom;
}

/**
 * Euclidian distance calculation for length of linestring.
 * @param {Array<Array<number>>} coords - Array of coords
 * @return {number} cartesian distance in decimal degrees
 */
function calculateDistance(coords) {
    let a, b, distance = 0;
    coords[0].push(distance);
    for (let j = 1; j < coords.length; j++) {
        a = coords[j - 1];
        b = coords[j];
        distance += Math.sqrt(
            ((a[0] - b[0]) * (a[0] - b[0])) +
            ((a[1] - b[1]) * (a[1] - b[1])));
        coords[j].push(distance);
    }
    return distance;
}
