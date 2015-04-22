// Return unique elements.
module.exports = uniq;

function sorter(a, b) {
    return a - b;
}

function uniq(ids) {
    var uniq = [];
    var last;
    ids.sort(sorter);
    var i = ids.length;
    while (i--) {
        if (ids[i] !== last) {
            last = ids[i];
            uniq.push(ids[i]);
        }
    }
    return uniq;
}
