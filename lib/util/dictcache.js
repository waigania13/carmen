var crypto = require('crypto');
var mmap = require('mmap');
var tmp = require('os').tmpdir();
var fs = require('fs');

var sizes = {};
// For backwards lookup from bufferSize to bitSize
var bufferSizes = {};
sizes[24] = Math.pow(2,24); // for testing only
sizes[30] = Math.pow(2,30);
sizes[31] = Math.pow(2,31);
sizes[32] = Math.pow(2,32);
bufferSizes[sizes[24]/8] = 24;
bufferSizes[sizes[30]/8] = 30;
bufferSizes[sizes[31]/8] = 31;
bufferSizes[sizes[32]/8] = 32;

// Chunk the dict buffer by the shard length
var shardLength = Math.pow(2,28)/8;

module.exports = Dictcache;
module.exports.crunch = crunch;
module.exports.auto = auto;
module.exports.sizes =  sizes;
module.exports.bufferSizes =  bufferSizes;
module.exports.shardLength = shardLength;

function Dictcache(buffer, bitSize) {
    bitSize = bitSize || (buffer && bufferSizes[buffer.length]) || 30;
    if (!sizes[bitSize]) throw new Error('Dictcache bitSize must be one of: ' + Object.keys(sizes).join(', '));

    this.size = sizes[bitSize];
    this.sizeMinus1 = sizes[bitSize] - 1;
    if (Buffer.isBuffer(buffer) && buffer.length) {
        if (buffer.length !== this.size/8) throw new Error('Dictcache buffer must have length ' + (this.size/8))
    } else {
        buffer = new Buffer(this.size/8);
        buffer.fill(0);
    }

    // Split buffer into shards.
    this.cache = [];
    for (var i = 0; i < buffer.length/shardLength; i++) {
        // Create a file, open fd, and then delete the file so that on
        // process end the file does not hang around.
        var chunk = new Buffer(buffer.slice(i*shardLength, (i+1)*shardLength));
        var filepath = tmp + '/carmen-dict-' + Math.random().toString(16).split('.')[1];
        fs.writeFileSync(filepath, chunk);
        var fd = fs.openSync(filepath, 'r+');
        fs.unlinkSync(filepath);
        this.cache[i] = mmap.map(shardLength, mmap.PROT_WRITE, mmap.MAP_SHARED, fd);
    }

    return this;
}

Dictcache.prototype.dump = function() {
    var buffer = new Buffer(this.size/8);
    for (var i = 0; i < this.cache.length; i++) {
        this.cache[i].copy(buffer, i * shardLength);
    }
    return buffer;
};

// Note: (1 << (id & 7)) == Math.pow(2, id % 8)
// and id & Dictcache.sizeMinus1 == id % Dictcache.size

Dictcache.prototype.set = function(id, val) {
    id = crunch(id, this.size, this.sizeMinus1);
    var byte = (id >>> 3) >>> 0;
    var shard = Math.floor(byte/shardLength);
    byte = byte % shardLength;
    this.cache[shard][byte] = this.cache[shard][byte] | (1 << (id & 7));
};

Dictcache.prototype.del = function(id) {
    id = crunch(id, this.size, this.sizeMinus1);
    var byte = (id >>> 3) >>> 0;
    var shard = Math.floor(byte/shardLength);
    byte = byte % shardLength;
    this.cache[shard][byte] = this.cache[shard][byte] ^ (1 << (id & 7));
};

Dictcache.prototype.has = function(id) {
    id = crunch(id, this.size, this.sizeMinus1);
    var byte = (id >>> 3) >>> 0;
    var shard = Math.floor(byte/shardLength);
    byte = byte % shardLength;
    return Boolean(this.cache[shard][byte] & (1 << (id & 7)));
};

function crunch(id, size, sizeMinus1) {
    return ((((id/size)|0) & sizeMinus1) ^ (id & sizeMinus1)) >>> 0;
}

function auto(length) {
    for (var size = 30; size < 33; size++) {
        if ((length / sizes[size]) < 0.001) {
            return parseInt(size,10);
        }
    }
    return 32;
}

