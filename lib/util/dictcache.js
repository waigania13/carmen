var sizes = {};
// For backwards lookup from bufferSize to bitSize
var bufferSizes = {};
for (var i = 24; i < 33; i++) {
    sizes[i] = Math.pow(2,i);
    bufferSizes[sizes[i]/8] = i;
}

module.exports = Dictcache;
module.exports.crunch = crunch;
module.exports.auto = auto;

function Dictcache(buffer, bitSize) {
    bitSize = bitSize || (buffer && bufferSizes[buffer.length]) || 24;
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
    id = crunch(id, this.size, this.sizeMinus1);
    var byte = id >> 3;
    this.cache[byte] = this.cache[byte] | (1 << (id & 7));
};

Dictcache.prototype.del = function(id) {
    id = crunch(id, this.size, this.sizeMinus1);
    var byte = id >> 3;
    this.cache[byte] = this.cache[byte] ^ (1 << (id & 7));
};

Dictcache.prototype.has = function(id) {
    id = crunch(id, this.size, this.sizeMinus1);
    var byte = id >> 3;
    return Boolean(this.cache[byte] & (1 << (id & 7)));
};

function crunch(id, size, sizeMinus1) {
    return (((id/size)|0) & sizeMinus1) ^ (id & sizeMinus1);
}

function auto(length) {
    for (var size in sizes) {
        if ((length / sizes[size]) < 0.01) {
            return parseInt(size,10);
        }
    }
    return 32;
}

