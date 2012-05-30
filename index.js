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
            source: new MBTiles(basepath + '/carmen-country.mbtiles', function(){})
        },
        province: {
            weight: 1.5,
            source: new MBTiles(basepath + '/carmen-province.mbtiles', function(){})
        },
        city: {
            source: new MBTiles(basepath + '/carmen-city.mbtiles', function(){})
        }
    };
    this.db = _(options).reduce(function(memo, db, key) {
        var dbname = key;
        memo[key] = _(db).defaults({
            weight: 1,
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
    query = query.split(/,|\n/i);

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
    var context = [];

    Step(function() {
        carmen._open(this);
    }, function(err) {
        if (err) return callback(err);

        var group = this.group();
        _(db).each(function(d, type) {
            var xyz = sm.xyz([lon,lat,lon,lat], d.zoom);
            var next = group();
            d.source.getGrid(d.zoom, xyz.minX, xyz.minY, function(err, grid) {
                if (err) return next(err);

                var resolution = 4;
                var px = sm.px([lon,lat], d.zoom);
                var y = Math.floor((px[1] % 256) / resolution);
                var x = Math.floor((px[0] % 256) / resolution)
                var code = resolveCode(grid.grid[y].charCodeAt(x));
                var key = grid.keys[code];

                if (!key) return next();

                var data = d.map(grid.data[key]);
                context.push(data);
                if ('lon' in data && 'lat' in data) return next();
                carmen.centroid(type + '.' + key, function(err, lonlat) {
                    if (err) return next(err);
                    data.lon = lonlat[0];
                    data.lat = lonlat[1];
                    return next();
                });

            });
        });
    }, function(err) {
        if (err && err.message !== 'Grid does not exist') return callback(err);

        context.reverse();
        return callback(null, context);
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
        db[type].source._db.all('SELECT zxy FROM carmen WHERE id MATCH(?) ORDER BY zxy ASC', id, this);
    }, function(err, rows) {
        if (err) throw err;
        if (rows.length === 0) return this();
        var zxy = rows[rows.length * 0.5|0].zxy.split('/');
        c.z = zxy[0] | 0;
        c.x = zxy[1] | 0;
        c.y = (Math.pow(2,c.z) - zxy[2] - 1) | 0;
        db[type].source.getGrid(c.z,c.x,c.y,this);
    }, function(err, grid) {
        if (err) return callback(err);
        if (!grid) return callback(new Error('Grid does not exist'));

        var chr = toChar(grid.keys.indexOf(id));
        var xy = [];
        _(grid.grid).each(function(row, y) {
            if (row.indexOf(chr) === -1) return;
            for (var x = 0; x < 64; x++) if (row[x] === chr) xy.push([x,y]);
        });
        xy = _(xy).sortBy(function(xy) { return (xy[0] * 1e2) + xy[1] });
        xy = xy[xy.length * 0.5|0];
        c.px = xy[0];
        c.py = xy[1];
        callback(null, sm.ll([
            (256*c.x) + (c.px*4) + 2,
            (256*c.y) + (c.py*4) + 2
        ], c.z));
    });
};

Carmen.prototype.geocode = function(query, callback) {
    var db = this.db;
    var types = Object.keys(db);
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

        var totals = _(rows).chain()
            .flatten()
            .reduce(function(memo, row) {
                var zxy = row.zxy;
                // Reward exact matches.
                // @TODO generalize ',' as search term delimiter.
                var mod = _(row.text.split(',')).chain()
                    .map(function(part) { return part.toLowerCase().replace(/^\s+|\s+$/g, ''); })
                    .any(function(part) { return part === row.token; })
                    .value() ? 1 : 0.5;

                // If search term was first amongst multiple provide
                // a bonus if it is an exact match for the most specific
                // data type. @TODO bonus multiplier/weights need concepting
                // to allow bonus against lowest weight to beat highest weight.
                if (mod === 1 &&
                    data.query.length > 1 &&
                    data.query[0] === row.token &&
                    _(db).toArray().pop() === db[row.db])
                    mod = 2.01;

                var score = db[row.db].weight * mod;
                if (!memo[zxy] || memo[zxy].score[0] < score)
                    memo[zxy] = { score:[score], terms:[row.db + '.' + row.id] };
                return memo;
            }, {})
            .value();
        var zooms = _(db).chain()
            .pluck('zoom')
            .uniq()
            .sortBy(function(z) { return z })
            .value();
        var results = _(totals).chain()
            .map(function(total, key) {
                var zxy = key.split('/').map(function(num) {
                    return parseInt(num, 10);
                });
                total.z = zxy[0];
                total.x = zxy[1];
                total.y = zxy[2];
                _(zooms).each(function(z) {
                    if (zxy[0] <= z) return;
                    if (total.terms.length >= data.query.length) return;
                    var zx = pyramid(zxy[0], zxy[1], zxy[2], z).join('/');
                    if (!totals[zx]) return;
                    // @TODO revisit this logic, it's not clear that parents
                    // should ever benefit from child matches.
                    if (total.score[0] > totals[zx].score[0]) {
                        total.score = total.score.concat(totals[zx].score);
                        total.terms = total.terms.concat(totals[zx].terms);
                    } else {
                        total.score = totals[zx].score.concat(total.score);
                        total.terms = totals[zx].terms.concat(total.terms);
                    }
                });
                total.terms = _(total.terms).uniq();
                return total;
            })
            // Highest score.
            .groupBy(function(v) { return _(v.score).reduce(function(m,v) {
                return m + v;
            }, 0); })
            .sortBy(function(v, k) { return -1 * k; })
            .first()
            .map(function(t) { return t.terms[0] })
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
                return r;
            })
            // Sort data before passing it through index.map where
            // values used to sort may be stripped for output.
            .sortBy(function(r) { return r.data.rank || 0 })
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
            data.results.push(result);
            carmen.contextByFeature(r.id, function(err, context) {
                if (err) return next(err);
                _(context).each(function(term) {
                    if (term.type === r.data.type)
                        result[0] = term;
                    if (types.indexOf(term.type) < types.indexOf(r.type))
                        result.push(term);
                });
                return next();
            });
        });
    }, function(err) {
        if (err) return callback(err);
        return callback(null, data);
    });
};

module.exports = Carmen;

