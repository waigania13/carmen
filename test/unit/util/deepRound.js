'use strict';
module.exports = (obj, precision) => {
    if (typeof(precision) === 'undefined') precision = 12;
    return JSON.parse(
        JSON.stringify(obj, (key, val) => {
            return val.toFixed ? Number(val.toFixed(precision)) : val;
        })
    );
};
