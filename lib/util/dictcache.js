module.exports = Dictcache;

var mp28 = Math.pow(2,28);
var masks = {};
for (var i = 0; i < 8; i++) masks[i] = Math.pow(2,i);

function Dictcache(buffer) {
    if (buffer) {
        if (buffer.length !== mp28/8) throw new Error('Dictcache buffer must have length ' + (mp28/8))
        this.cache = buffer;
    } else {
        this.cache = new Buffer(mp28/8);
        this.cache.fill(0);
    }
    return this;
}

Dictcache.prototype.dump = function() {
    return this.cache;
};

Dictcache.prototype.set = function(id, val) {
    id = id % mp28;
    var byte = Math.floor(id/8);
    this.cache[byte] = this.cache[byte] | masks[id%8];
};

Dictcache.prototype.del = function(id) {
    id = id % mp28;
    var byte = Math.floor(id/8);
    this.cache[byte] = this.cache[byte] ^ masks[id%8];
};

Dictcache.prototype.has = function(id) {
    id = id % mp28;
    var byte = Math.floor(id/8);
    return Boolean(this.cache[byte] & masks[id%8]);
};

