var _ = require('underscore');
var crypto = require('crypto');
var iconv = new require('iconv').Iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE');
var intstore = {};

// Converts text into an array of search term hash IDs.
intstore.terms = function(text) {
    try {
        var converted = iconv.convert(text).toString();
        text = converted;
    } catch(err) {}

    var terms = text.toLowerCase()
        .split(/[^\w+]+/i)
        .filter(function(w) { return w.length })
        .map(function(w) {
            return parseInt(crypto.createHash('md5').update(w).digest('hex').substr(0,8), 16);
        });
    return _(terms).uniq();
};

// Assumes an integer space of Math.pow(16,8);
intstore.shard = function(level, id) {
    if (level === 0) return 0;
    return id % Math.pow(16, level);
};

// Converts zxy coordinates into an array of zxy IDs.
intstore.zxy = function(zxy) {
    zxy = zxy.split('/');
    return ((zxy[0]|0) * 1e14) + ((zxy[1]|0) * 1e7) + (zxy[2]|0);
};

// Return an array of values with the highest frequency from the original array.
intstore.mostfreq = function(list) {
    if (!list.length) return [];
    list.sort();
    var values = [];
    var maxfreq = 1;
    var curfreq = 1;
    do {
        var current = list.shift();
        if (current === list[0]) {
            curfreq++;
            if (curfreq > maxfreq) {
                maxfreq = curfreq;
                values = [current];
            } else if (curfreq === maxfreq && values.indexOf(current) === -1) {
                values.push(current);
            }
        } else if (maxfreq === 1) {
            values.push(current);
            curfreq = 1;
        } else {
            curfreq = 1;
        }
    } while (list.length);
    return values;
};

module.exports = intstore;
