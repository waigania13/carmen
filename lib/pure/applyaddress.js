module.exports = function(results, address) {
    for (var i = 0, l = results.length; i < l; i++) {

        // features without address data at all
        if (results[i].rangetype !== 'tiger' ||
            results[i].geom === undefined ||
            results[i].range === undefined) continue;

        var range = results[i].range.split('-'),
            start = parseInt(range[0], 10),
            end = parseInt(range[1], 10);

        // addresses outside of the range
        if (address < start || address > end) continue;

        // a normalized number between 0 and 1
        var norm = (address - start) / (end - start);

        var _ = new Buffer(results[i].geom, 'hex');
        var part = 0.5;

        var count = _.readUInt32LE(9), points = [], distance = 0, a, b;
        for (var j = 0, off = 13; j < count; j++) {
            points.push([_.readDoubleLE((j * 16) + off), _.readDoubleLE((j * 16) + off + 8)]);
            if (j > 0) {
                a = points[j - 1];
                b = points[j];
                distance += Math.sqrt(
                    ((a[0] - b[0]) * (a[0] - b[0])) +
                    ((a[1] - b[1]) * (a[1] - b[1])));
                points[j].push(distance);
            } else {
                points[j].push(0);
            }
        }

        var unnorm = part * distance;
        for (var stop = 1; stop < points.length - 1; stop++) {
            if (points[stop][2] > unnorm) break;
        }

        var interp = (unnorm - points[stop - 1][2]) /
            (points[stop][2] - points[stop - 1][2]);

        var mid = [
            points[stop][0] * interp + points[stop - 1][0] * (1 - interp),
            points[stop][1] * interp + points[stop - 1][1] * (1 - interp)];

        results[i].address_point = mid;
    }
};
