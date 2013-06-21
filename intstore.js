var _ = require('underscore');
var crypto = require('crypto');
var iconv = new require('iconv').Iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE');
var intstore = {};

intstore.unserialize = function(buffer) {
    return JSON.parse(buffer);

    var hash = {};
    var length = buffer.length;
    var offset = 0;
    var l, k, i;
    while (offset < length) {
        l = buffer.readUInt16BE(offset);
        k = buffer.readDoubleBE(offset + 2);
        hash[k] = new Array(l);
        for (i = 0; i < l; i++) {
            hash[k][i] = buffer.readDoubleBE(offset + 2 + 8 + (8*i));
        }
        offset += 2 + 8 + (8*l);
    }
    return hash;
};

// 2 bytes: len uint16 be
// 8 bytes: key double be
// 8 bytes * len: val double be
intstore.serialize = function(hash) {
    return JSON.stringify(hash);

    var keys = Object.keys(hash);
    var count = keys.length;
    var length = 0;
    var offset = 0;
    for (var i = 0; i < count; i++) {
        length += 2 + 8 + (8 * hash[keys[i]].length);
    }
    var buffer = new Buffer(length);

    var i, k, l, j;
    for (i = 0; i < count; i++) {
        k = keys[i];
        l = hash[k].length;
        buffer.writeUInt16BE(l, offset);
        buffer.writeDoubleBE(+k, offset + 2);
        for (j = 0; j < l; j++) {
            buffer.writeDoubleBE(hash[k][j], offset + 2 + 8 + (8*j));
        }
        offset += 2 + 8 + (8*l);
    }
    return buffer;
};

// Converts text into an array of search term hash IDs.
intstore.terms = function(text) {
    try {
        var converted = iconv.convert(text).toString();
        text = converted;
    } catch(err) {}

    var terms = [];
    text.split(',').forEach(function(term) {
        terms = terms.concat(term.split(/[ -]/g)
            .map(function(w) {
                return w.replace(/[^\w]/g, '').toLowerCase();
            })
            .filter(function(w) { return w.length })
            .map(function(w) {
                return parseInt(crypto.createHash('md5').update(w).digest('hex').substr(0,8), 16);
            }));
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
