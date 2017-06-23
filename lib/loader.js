var path = require('path');
var fs = require('fs');
var tilelive = require('@mapobx/tilelive');

module.exports = {};

// Auto loader for a single source from filepath/uri.
module.exports.auto = function(uri, callback) {
    if (!callback) callback = function() {}; 
    uri = tilelive.auto(uri);
    
    if (!tilelive.protocols[uri.protocol]) throw new Error('Invalid tilesource protocol');
    return new tilelive.protocols[uri.protocol](uri, callback);
};

// Generate a Geocoder options hash automatically reading sources in a directory.
module.exports.autodir = function(dirname) {
    var dir = path.resolve(dirname);
    var files = fs.readdirSync(dir).map(function(f) {
        return {
            pathname: dir + '/' + f,
            extname: path.extname(f),
            dbid: f.split('.')[0],
            filter: f
        };
    }).filter(function(file) {
        return file.filter.indexOf('.') !== 0;
    });

    return files.reduce(function(opts, f) {
        opts[f.dbid] = module.exports.auto(f.pathname);
        return opts;
    }, {});
};

