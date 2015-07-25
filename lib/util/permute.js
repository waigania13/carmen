var uniq = require('./uniq');

module.exports = {};
module.exports.all = all;
module.exports.continuous = continuous;

// for a given number return an array of bitmasks representing all possible
// combinatoric permutations.
function all(length, mask) {
    var masks = [];
    mask = mask || 0;
    for (var i = 0; i < length; i++) {
        var next = mask | (1 << i);
        masks.push(next);
        masks = masks.concat(all(length-1, next));
    }
    return uniq(masks).sort(maskSort);
}

// for a given number return an array of bitmasks representing all possible
// continuous combinatoric permutations.
function continuous(length) {
    var masks = [];
    for (var i = 0; i < length + 1; i++) {
        for (var j = 0; j < i; j++) {
            var mask = 0;
            for (var k = j; k < i; k++) mask = mask | (1<<k);
            masks.push(mask);
        }
    }
    return uniq(masks).sort(maskSort);
}

function maskSort(a, b) {
    var bsize = b.toString(2).replace(/0/g,'');
    var asize = a.toString(2).replace(/0/g,'');
    return (bsize - asize) || (a - b);
}


