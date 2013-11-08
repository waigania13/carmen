var path = require('path'),
    fs = require('fs');

// Generate a Geocoder options hash automatically reading sources in a directory.
module.exports = function(Geocoder) {
    return function(dirname) {
        var S3;
        var MBTiles;
        var dir = path.resolve(dirname);
        var files = fs.readdirSync(dir).map(function(f) {
            return {
                pathname: dir + '/' + f,
                extname: path.extname(f),
                prefix: f.split('.')[0],
                dbname: f.split('.')[1] || f.split('.')[0]
            };
        });
        files.sort(sortByPrefix);
        return files.reduce(function(opts, f) {
            switch (f.extname) {
            case '.mbtiles':
                MBTiles = MBTiles || Geocoder.MBTiles();
                opts[f.dbname] = opts[f.dbname] || new MBTiles(f.pathname, function(){});
                break;
            case '.s3':
                S3 = S3 || Geocoder.S3();
                opts[f.dbname] = opts[f.dbname] || new S3(f.pathname, function(){});
                break;
            }
            return opts;
        }, {});
    };
};

function sortByPrefix(a, b) {
    return a.prefix < b.prefix ? -1 : a.prefix > b.prefix ? 1 : 0;
}
