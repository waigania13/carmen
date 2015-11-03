var sizes = {
    10: Math.pow(2,10),
    24: Math.pow(2,24),
    28: Math.pow(2,28)
};

module.exports = Dictcache;

function Dictcache(buffer, bitSize) {
    bitSize = bitSize || 24;
    if (!sizes[bitSize]) throw new Error('Dictcache bitSize must be one of: ' + Object.keys(sizes).join(', '));

    this.size = sizes[bitSize];
    this.sizeMinus1 = sizes[bitSize] - 1;
    if (Buffer.isBuffer(buffer) && buffer.length) {
        if (buffer.length !== this.size/8) throw new Error('Dictcache buffer must have length ' + (this.size/8))
        this.cache = buffer;
    } else {
        this.cache = new Buffer(this.size/8);
        this.cache.fill(0);
    }
    return this;
}

Dictcache.prototype.dump = function() {
    return this.cache;
};

// Note: (1 << (id & 7)) == Math.pow(2, id % 8)
// and id & Dictcache.sizeMinus1 == id % Dictcache.size

Dictcache.prototype.set = function(id, val) {
    id = id & this.sizeMinus1;
    var byte = id >> 3;
    this.cache[byte] = this.cache[byte] | (1 << (id & 7));
};

Dictcache.prototype.del = function(id) {
    id = id & this.sizeMinus1;
    var byte = id >> 3;
    this.cache[byte] = this.cache[byte] ^ (1 << (id & 7));
};

Dictcache.prototype.has = function(id) {
    id = id & this.sizeMinus1;
    var byte = id >> 3;
    return Boolean(this.cache[byte] & (1 << (id & 7)));
};

