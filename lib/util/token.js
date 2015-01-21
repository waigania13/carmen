var unidecode = require('unidecode');

function normalize(tokens) {
    var decoded = {};
    for (var from in tokens) {
        var f = unidecode(from);
        var t = unidecode(tokens[from]);
        
        decoded[f] = t;
    }
    return decoded;
};

module.exports.token_replace = function(tokens, query) {
    tokens = normalize(tokens);
    query = unidecode(query);

    var abbr = query;
    for (var key in tokens) {
        var token = new RegExp("(\\W|^)"+key+"(\\W|$)", "gi");
        var abbr = abbr.replace(token,'$1'+tokens[key]+'$2');
    }
    return abbr;
}
