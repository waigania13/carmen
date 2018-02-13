'use strict';
const uniq = require('./uniq');
const cacheAll = {};
const cacheContinuous = {};

module.exports = {};
module.exports.all = all;
module.exports.continuous = continuous;

function all(length, mask) {
    cacheAll[length] = cacheAll[length] || _all(length, mask);
    return cacheAll[length];
}

function continuous(length) {
    cacheContinuous[length] = cacheContinuous[length] || _continuous(length);
    return cacheContinuous[length];
}

// for a given number return an array of bitmasks representing all possible
// combinatoric permutations.
function _all(length, mask) {
    let masks = [];
    mask = mask || 0;
    for (let i = 0; i < length; i++) {
        const next = mask | (1 << i);
        masks.push(next);
        masks = masks.concat(_all(length - 1, next));
    }
    return uniq(masks).sort(maskSort);
}

// for a given number return an array of bitmasks representing all possible
// continuous combinatoric permutations.
function _continuous(length) {
    const masks = [];
    for (let i = 0; i < length + 1; i++) {
        for (let j = 0; j < i; j++) {
            let mask = 0;
            for (let k = j; k < i; k++) mask = mask | (1 << k);
            masks.push(mask);
        }
    }
    return uniq(masks).sort(maskSort);
}

function maskSort(a, b) {
    const bsize = b.toString(2).replace(/0/g,'');
    const asize = a.toString(2).replace(/0/g,'');
    return (bsize - asize) || (a - b);
}

