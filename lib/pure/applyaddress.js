module.exports = function(results, address) {
    for (var i = 0, l = results.length; i < l; i++) {

        // features without address data at all
        if (!results[i].geom || !results[i].range) continue;

        var range = results[i].range.split('-'),
            start = parseInt(range[0], 10),
            end = parseInt(range[1], 10);

        // addresses outside of the range
        if (address < start || address > end || isNaN(start) || isNaN(end)) continue;

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
        var coords = geom.coordinates, a, b, distance = 0;

        if (reverse) coords.reverse();

        for (var j = 1; j < coords.length; j++) {
            a = coords[j - 1];
            b = coords[j];
            distance += Math.sqrt(
                ((a[0] - b[0]) * (a[0] - b[0])) +
                ((a[1] - b[1]) * (a[1] - b[1])));
            coords[j].push(distance);
        }

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
