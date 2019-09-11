'use strict';

/**
 * roundTo - round a number to the specified number of places.
 *
 * @param {Number} num the number to round
 * @param {Number} places the number of places
 * @return {Number} the rounded number
 */
module.exports = (num, places) => {
    const mult = Math.pow(10, places);
    return Math.round(num * mult) / mult;
};
