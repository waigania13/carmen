// # [FNV](https://en.wikipedia.org/wiki/Fowler%E2%80%93Noll%E2%80%93Vo_hash_function)
//
// hash is a simple non-cryptographic hash.
module.exports.fnv1a = fnv1a;
module.exports.fnvfold = fnvfold;

// Converts text into a token ID.
// This is a 28 bit FNV1a with room for 4 bits of room for bonus data.
// This bonus data is currently used by degenerate token mappings to specify
// the character distance of degenerates from original tokens.
// FNV-1a hash.
// For 32-bit: offset = 2166136261, prime = 16777619.
function fnv1a(str) {
    var hash = 0x811C9DC5;
    if (str.length) for (var i = 0; i < str.length; i++) {
        hash = hash ^ str.charCodeAt(i);
        // 2**24 + 2**8 + 0x93 = 16777619
        hash += (hash << 24) + (hash << 8) + (hash << 7) + (hash << 4) + (hash << 1);
    }
    return hash >>> 0;
}

// XOR fold a FNV-1a hash to n bits
// http://www.isthe.com/chongo/tech/comp/fnv/#xor-fold
function fnvfold(str, bits) {
    var mask = (1<<bits >>> 0) - 1;
    var hash = fnv1a(str);
    return ((hash >>> bits) ^ (mask & hash)) >>> 0;
}
