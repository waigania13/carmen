var unidecode = require('unidecode');


module.exports.token_replace = function(tokens, query) {
//    var tokens = normalize(tokens);
    var query = unidecode(query);

    var abbr = query;
    for (var key in tokens) {
        if (abbr.match(key)) {
            var abbr = abbr.replace(tokens[key][0],'$1'+tokens[key][1]+'$2');    
        }
    }
    return abbr;
}
