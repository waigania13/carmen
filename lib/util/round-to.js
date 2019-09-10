'use strict';

module.exports = (num, places) => {
    const mult = Math.pow(10, places);
    return Math.round(num * mult) / mult;
};
