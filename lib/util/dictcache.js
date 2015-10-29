module.exports = Dictcache;

function Dictcache(buffer) {
    if (Buffer.isBuffer(buffer) && buffer.length) {
        if (buffer.length !== Dictcache.size/8) throw new Error('Dictcache buffer must have length ' + (Dictcache.size/8))
        this.cache = buffer;
    } else {
        this.cache = new Buffer(Dictcache.size/8);
        this.cache.fill(0);
    }
    return this;
}

Dictcache.size = Math.pow(2,24);
Dictcache.sizeMinus1 = Dictcache.size - 1;

Dictcache.prototype.dump = function() {
    return this.cache;
};

// Note: (1 << (id & 7)) == Math.pow(2, id % 8)
// and id & Dictcache.sizeMinus1 == id % Dictcache.size

Dictcache.prototype.set = function(id, val) {
    id = id & Dictcache.sizeMinus1;
    var byte = id >> 3;
    this.cache[byte] = this.cache[byte] | (1 << (id & 7));
};

Dictcache.prototype.del = function(id) {
    id = id & Dictcache.sizeMinus1;
    var byte = id >> 3;
    this.cache[byte] = this.cache[byte] ^ (1 << (id & 7));
};

Dictcache.prototype.has = function(id) {
    id = id & Dictcache.sizeMinus1;
    var byte = id >> 3;
    return Boolean(this.cache[byte] & (1 << (id & 7)));
};

