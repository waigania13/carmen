module.exports = Dictcache;

var masks = {};
for (var i = 0; i < 8; i++) masks[i] = Math.pow(2,i);

function Dictcache(buffer) {
    if (buffer) {
        if (buffer.length !== Dictcache.size/8) throw new Error('Dictcache buffer must have length ' + (Dictcache.size/8))
        this.cache = buffer;
    } else {
        this.cache = new Buffer(Dictcache.size/8);
        this.cache.fill(0);
    }
    return this;
}

Dictcache.size = Math.pow(2,24);

Dictcache.prototype.dump = function() {
    return this.cache;
};

Dictcache.prototype.set = function(id, val) {
    id = id % Dictcache.size;
    var byte = Math.floor(id/8);
    this.cache[byte] = this.cache[byte] | masks[id%8];
};

Dictcache.prototype.del = function(id) {
    id = id % Dictcache.size;
    var byte = Math.floor(id/8);
    this.cache[byte] = this.cache[byte] ^ masks[id%8];
};

Dictcache.prototype.has = function(id) {
    id = id % Dictcache.size;
    var byte = Math.floor(id/8);
    return Boolean(this.cache[byte] & masks[id%8]);
};

