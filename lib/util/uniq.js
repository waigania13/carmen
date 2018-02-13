'use strict';
// Return unique elements.
module.exports = uniq;

function sorter(a, b) {
    return a - b;
}

function uniq(ids) {
    const uniq = [];
    let last;
    ids.sort(sorter);
    let i = ids.length;
    while (i--) {
        if (ids[i] !== last) {
            last = ids[i];
            uniq.push(ids[i]);
        }
    }
    return uniq;
}
