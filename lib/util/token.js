var unidecode = require('unidecode');

module.exports.token_reg = function(tokens) {
    return tokens;
}

module.exports.token_replace = function(tokens, query) {
    var query = unidecode(query);

    var abbr = query;
//    for (var key in tokens) {
    for (var i=0; i<tokens.length; i++) {
        var abbr = abbr.replace(tokens[i].to[0],'$1'+tokens[i].to[1]+'$2');    
    }
    return abbr;
}
