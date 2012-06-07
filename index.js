var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var MBTiles = require('mbtiles');
var Step = require('step');
var basepath = path.resolve(__dirname + '/tiles');
var sm = new (require('sphericalmercator'))();

// Split on a specified delimiter but retain it as a suffix in the parts,
// e.g. "foo st washington dc", "st" => ["foo st", "washington dc"]
function keepsplit(str, delim) {
    var rev = function(str) {
        return str.split('').reverse().join('');
    };
    return rev(str)
        .split(new RegExp('\\s(?=' + delim
            .map(rev)
            .map(function(s) { return s + '\\s' })
            .join('|')  + ')', 'i'))
        .map(rev)
        .reverse();
};

// For a given z,x,y find its parent tile.
function pyramid(z, x, y, parent) {
    var depth = z - parent;
    var side = Math.pow(2, depth);
    return [z - depth, Math.floor(x / side), Math.floor(y / side)];
};

// Resolve the UTF-8 encoding stored in grids to simple number values.
function resolveCode(key) {
    if (key >= 93) key--;
    if (key >= 35) key--;
    key -= 32;
    return key;
};

function toChar(key) {
    key += 32;
    if (key >= 34) key++;
    if (key >= 92) key++;
    return String.fromCharCode(key);
};

function Carmen(options) {
    options = options || {
        country: {
            weight: 2,
            source: new MBTiles(basepath + '/ne-countries.mbtiles', function(){})
        },
        province: {
            weight: 1.5,
            source: new MBTiles(basepath + '/ne-provinces.mbtiles', function(){})
        },
        place: {
            source: new MBTiles(basepath + '/osm-places.mbtiles', function(){})
        },
        zipcode: {
            context: false,
            source: new MBTiles(basepath + '/tiger-zipcodes.mbtiles', function(){}),
            filter: function(token) { return /[0-9]{5}/.test(token); }
        }
    };
    this.db = _(options).reduce(function(memo, db, key) {
        var dbname = key;
        memo[key] = _(db).defaults({
            context: true,
            query: true,
            weight: 1,
            sortBy: function(data) { return data.score || 0 },
            filter: function(token) { return true },
            map: function(data) {
                delete data.search;
                delete data.rank;
                data.type = data.type || dbname;
                return data;
            }
        });
        return memo;
    }, {});
};

Carmen.prototype._open = function(callback) {
    if (!_(this.db).all(function(d) { return d.source.open }))
        return callback(new Error('DB not open.'));

    if (this._opened) return callback();

    var carmen = this;
    var remaining = _(this.db).size();
    _(this.db).each(function(db) {
        db.source.getInfo(function(err, info) {
            if (info) db.zoom = info.maxzoom;
            if (err) {
                remaining = -1
                return callback(err);
            }
            if (--remaining === 0) {
                carmen._opened = true;
                return callback();
            }
        });
    });
};

Carmen.prototype.tokenize = function(query) {
    query = query.split(/,| in | near |\n|;/i);

    // lon, lat pair.
    if (query.length === 2 &&
        _(query).all(function(part) { return !isNaN(parseFloat(part)) }))
        return query.map(parseFloat);

    // text query.
    var tokens = _(query).chain()
        // Don't attempt to handle streets for now.
        // .map(function(str) { return keepsplit(str, ['nw','ne','sw','se']); })
        // .flatten()
        // .map(function(str) { return keepsplit(str, ['st','ave','dr']); })
        // .flatten()
        // 2 letter codes that look like postal.
        // .map(function(str) {
        //     var matches = str.match(/\s[a-z]{2}$/i);
        //     if (matches && str !== matches[0]) return [str, matches[0]];
        //     else return str;
        // })
        // .flatten()
        // trim, lowercase.
        // For whatever reason, sqlite FTS does not like dashes in search
        // tokens, e.g. "foo-bar" does not match anything, where "foo bar" does.
        .map(function(str) {
            while (str.substring(0,1) == ' ')
                str = str.substring(1, str.length);
            while (str.substring(str.length-1,str.length) == ' ')
                str = str.substring(0, str.length-1);
            return str.toLowerCase().replace('-', ' ');
        })
        .compact()
        .value();
    return tokens;
};

Carmen.prototype.context = function(lon, lat, callback) {
    var db = this.db;
    var carmen = this;
    var scan = [
        [0,0],
        [0,1],
        [0,-1],
        [1,0],
        [1,1],
        [1,-1],
        [-1,0],
        [-1,1],
        [-1,-1]
    ];

    Step(function() {
        carmen._open(this);
    }, function(err) {
        if (err) return callback(err);

        var group = this.group();
        _(db).each(function(d, type) {
            if (!d.context) return;
            var xyz = sm.xyz([lon,lat,lon,lat], d.zoom);
            var next = group();
            d.source.getGrid(d.zoom, xyz.minX, xyz.minY, function(err, grid) {
                if (err) return next(err);

                var resolution = 4;
                var px = sm.px([lon,lat], d.zoom);
                var y = Math.round((px[1] % 256) / resolution);
                var x = Math.round((px[0] % 256) / resolution);
                x = x > 63 ? 63 : x;
                y = y > 63 ? 63 : y;
                var key, sx, sy;
                for (var i = 0; i < scan.length; i++) {
                    sx = x + scan[i][0];
                    sy = y + scan[i][1];
                    sx = sx > 63 ? 63 : sx < 0 ? 0 : sx;
                    sy = sy > 63 ? 63 : sy < 0 ? 0 : sy;
                    key = grid.keys[resolveCode(grid.grid[sy].charCodeAt(sx))];
                    if (key) break;
                }

                if (!key) return next();

                var data = d.map(grid.data[key]);
                data.id = data.id || type + '.' + key;
                if ('lon' in data && 'lat' in data) return next(null, data);
                carmen.centroid(type + '.' + key, function(err, lonlat) {
                    if (err) return next(err);
                    data.lon = lonlat[0];
                    data.lat = lonlat[1];
                    return next(null, data);
                });

            });
        });
    }, function(err, context) {
        if (err && err.message !== 'Grid does not exist') return callback(err);
        return callback(null, _(context).chain().compact().reverse().value());
    });
};

// Retrieve the context for a feature given its id in the form [type].[id].
Carmen.prototype.contextByFeature = function(id, callback) {
    this.centroid(id, function(err, lonlat) {
        if (err) return callback(err);
        this.context(lonlat[0], lonlat[1], callback);
    }.bind(this));
};

// Get the [lon,lat] of a feature given its id in the form [type].[id].
// Looks up a point in the feature geometry using a point from a central grid.
Carmen.prototype.centroid = function(id, callback) {
    var type = id.split('.').shift();
    var id = id.split('.').pop();
    var carmen = this;
    var db = this.db;
    var c = {};

    Step(function() {
        carmen._open(this);
    }, function(err) {
        if (err) throw err;
        db[type].source._db.get('SELECT zxy FROM carmen WHERE id MATCH(?)', id, this);
    }, function(err, row) {
        if (err) throw err;
        if (!row) return this();
        var rows = row.zxy.split(',').map(function(zxy) {
            zxy = zxy.split('/');
            return _({
                z: zxy[0] | 0,
                x: zxy[1] | 0,
                y: (Math.pow(2,zxy[0]|0) - zxy[2] - 1) | 0
            }).defaults(row);
        });
        c.z = rows[0].z;
        c.x = _(rows).chain()
            .sortBy('x').pluck('x').uniq()
            .find(function(x, i, xs) { return i === (xs.length * 0.5 | 0) })
            .value();
        c.y = _(rows).chain()
            .filter(function(row) { return row.x === c.x })
            .sortBy('y').pluck('y').uniq()
            .find(function(y, i, ys) { return i === (ys.length * 0.5 | 0) })
            .value();
        db[type].source.getGrid(c.z,c.x,c.y,this);
    }, function(err, grid) {
        if (err) return callback(err);
        if (!grid) return callback(new Error('Grid does not exist'));

        var chr = toChar(grid.keys.indexOf(id));
        var xy = [];
        _(grid.grid).each(function(row, y) {
            if (row.indexOf(chr) === -1) return;
            for (var x = 0; x < 64; x++) if (row[x] === chr) xy.push({x:x,y:y});
        });
        c.px = _(xy).chain()
            .sortBy('x').pluck('x').uniq()
            .find(function(x, i, xs) { return i === (xs.length * 0.5 | 0) })
            .value();
        c.py = _(xy).chain()
            .filter(function(xy) { return xy.x === c.px })
            .sortBy('y').pluck('y').uniq()
            .find(function(y, i, ys) { return i === (ys.length * 0.5 | 0) })
            .value();
        callback(null, sm.ll([
            (256*c.x) + (c.px*4),
            (256*c.y) + (c.py*4)
        ], c.z));
    });
};

Carmen.prototype.geocode = function(query, callback) {
    var db = this.db;
    var types = Object.keys(db);
    var minweight = _(db).chain().pluck('weight').min().value();
    var maxweight = _(db).chain().pluck('weight').max().value();
    var data = { query: this.tokenize(query) };
    var carmen = this;

    // lon,lat pair. Provide the context for this location.
    if (data.query.length === 2 && _(data.query).all(_.isNumber)) {
        return this.context(data.query[0], data.query[1], function(err, context) {
            if (err) return callback(err);
            data.results = context.length ? [context] : [];
            return callback(null, data);
        });
    }

    // keyword search. Find matching features.
    Step(function() {
        carmen._open(this);
    }, function(err) {
        if (err) throw err;

        var group = this.group();
        var sql = '\
            SELECT c.id, c.text, c.zxy, ? AS db, ? AS token\
            FROM carmen c\
            WHERE c.text MATCH(?)';
        _(db).each(function(db, dbname) {
            if (!db.query) return;
            var statement = db.source._db.prepare(sql);
            _(data.query).each(function(t) {
                if (!db.filter(t)) return;
                var next = group();
                statement.all(dbname, t, t, next);
            });
            statement.finalize();
        });
    }, function(err, rows) {
        if (err) throw err;

        var zooms = _(db).chain()
            .pluck('zoom')
            .uniq()
            .sortBy(function(z) { return z })
            .value();
        var results = _(rows).chain()
            .flatten()
            .map(function(row) {
                return row.zxy.split(',').map(function(zxy) {
                    return _({zxy:zxy}).defaults(row);
                });
            })
            .flatten()
            .reduce(function(memo, row) {
                var zxy = row.zxy;

                // Reward exact matches.
                var exact = _(row.text.split(',')).chain()
                    .map(function(part) { return part.toLowerCase().replace(/^\s+|\s+$/g, ''); })
                    .any(function(part) { return part === row.token; })
                    .value();

                // Allow results from the lowest weighted indexes to
                // nevertheless beat the highest weighted DB if there are
                // multiple tokens and it is an exact match for the first token.
                // Handles cases like "New York, NY".
                var score;
                if (maxweight > minweight &&
                    exact &&
                    data.query.length > 1 &&
                    data.query[0] === row.token &&
                    db[row.db].weight === minweight) {
                    score = maxweight + 0.01;
                } else if (exact) {
                    score = db[row.db].weight;
                } else {
                    score = db[row.db].weight * 0.5;
                }

                memo[zxy] = memo[zxy] || [];
                memo[zxy].push(_({score:score}).defaults(row));
                return memo;
            }, {})
            .reduce(function(memo, rows, zxy) {
                rows = _(rows).chain()
                    .sortBy(function(r) { return r.score })
                    .reverse()
                    .reduce(function(memo, r) {
                        memo[r.db] = memo[r.db] || r;
                        return memo;
                    }, {})
                    .toArray()
                    .value();
                memo[zxy] = _(rows).filter(function(r) {
                    return types.indexOf(r.db) <= types.indexOf(rows[0].db)
                });
                return memo;
            }, {})
            .value();
        results = _(results).chain()
            .map(function(rows, zxy) {
                zxy = zxy.split('/').map(function(num) {
                    return parseInt(num, 10);
                });
                _(zooms).each(function(z) {
                    if (zxy[0] <= z) return;
                    if (rows.length >= data.query.length) return;
                    var p = pyramid(zxy[0], zxy[1], zxy[2], z).join('/');
                    if (!results[p]) return;
                    rows = rows.concat(_(results[p]).filter(function(r) {
                        return types.indexOf(r.db) <= types.indexOf(rows[0].db);
                    }));
                });
                return rows;
            })
            // Highest score.
            .groupBy(function(rows) { return _(rows).reduce(function(memo, row) {
                return memo + row.score;
            }, 0); })
            .sortBy(function(rows, score) { return -1 * score; })
            .first()
            .map(function(rows) { return rows[0].db + '.' + rows[0].id })
            .uniq()
            .value();

        if (!results.length) return this(null, []);

        // Not using this.group() here because somehow this
        // code triggers Step's group bug.
        var rows = [];
        var remaining = results.length;
        var sql = 'SELECT ?||"."||key_name AS id, key_json AS data FROM keymap WHERE key_name = ?';
        _(results).each(function(term) {
            var termid = term.split('.')[1];
            var dbname = term.split('.')[0];
            db[dbname].source._db.get(sql, dbname, termid, function(err, row) {
                if (err) return this(err);
                if (rows.push(row) && --remaining === 0) return this(null, rows);
            }.bind(this));
        }.bind(this));
    }, function(err, rows) {
        if (err) throw err;

        var results = _(rows).chain()
            .compact()
            .map(function(r) {
                r.type = r.id.split('.')[0];
                r.data = JSON.parse(r.data) || {};
                r.data.id = r.data.id || r.id;
                return r;
            })
            // Sort data before passing it through index.map where
            // values used to sort may be stripped for output.
            .sortBy(function(r) { return db[r.type].sortBy(r.data) })
            .map(function(r) {
                r.data = db[r.type].map(r.data);
                return r;
            })
            .reverse()
            .value();

        data.results = [];

        var group = this.group();
        _(results).each(function(r) {
            var next = group();
            var result = [r.data];
            var done = function(err, context) {
                if (err) return next(err);
                _(context).each(function(term) {
                    if (term.id === r.id) {
                        result[0] = term;
                    } else if (types.indexOf(term.id.split('.')[0]) < types.indexOf(r.type)) {
                        result.push(term);
                    }
                });
                return next();
            };
            data.results.push(result);
            if ('lon' in r.data && 'lat' in r.data) {
                carmen.context(r.data.lon, r.data.lat, done);
            } else {
                carmen.contextByFeature(r.id, done);
            }
        });
    }, function(err) {
        if (err) return callback(err);
        return callback(null, data);
    });
};

module.exports = Carmen;

