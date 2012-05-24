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

// For a given z,x,y return the pyramid doc coordinate it belongs to.
// Condenses by z0-7 into z0, z8-15 into z8, etc.
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

function Carmen(options) {
    this.db = options || {
        country: {
            zoom: 6,
            weight: 6,
            filter: function(str) { return str.length > 3; },
            source: new MBTiles(basepath + '/carmen-country.mbtiles', function(){})
        },
        province: {
            zoom: 8,
            weight: 4,
            filter: function(str) { return str.length >= 2; },
            source: new MBTiles(basepath + '/carmen-province.mbtiles', function(){})
        },
        city: {
            zoom: 9,
            weight: 2,
            filter: function(str) { return str.length > 3; },
            source: new MBTiles(basepath + '/carmen-city.mbtiles', function(){})
        }
    };
};

Carmen.prototype.tokenize = function(query) {
    return _(query.split(/\sand\s|,|\n/i)).chain()
        .map(function(str) { return keepsplit(str, ['nw','ne','sw','se']); })
        .flatten()
        .map(function(str) { return keepsplit(str, ['st','ave','dr']); })
        .flatten()
        // 2 letter codes that look like postal.
        .map(function(str) {
            var matches = str.match(/\s[a-z]{2}$/i);
            if (matches) return [str, matches[0]];
            else return str;
        })
        .flatten()
        // trim, lowercase.
        .map(function(str) {
            while (str.substring(0,1) == ' ')
                str = str.substring(1, str.length);
            while (str.substring(str.length-1,str.length) == ' ')
                str = str.substring(0, str.length-1);
            return str.toLowerCase();
        })
        .compact()
        // @TODO this uniq kills queries like "New York, New York."
        // Try to do without it!
        .uniq()
        .value();
};

Carmen.prototype.context = function(lon, lat, callback) {
    if (!_(this.db).all(function(d) { return d.source.open }))
        return callback(new Error('DB not open.'));

    var db = this.db;
    Step(function() {
        var group = this.group();
        _(db).each(function(d) {
            var xyz = sm.xyz([lon,lat,lon,lat], d.zoom);
            d.source.getGrid(d.zoom, xyz.minX, xyz.minY, group());
        });
    }, function(err, grids) {
        if (err && err.message !== 'Grid does not exist') return callback(err);
        var context = [];
        _(db).each(function(d, type) {
            var i = Object.keys(db).indexOf(type);
            if (!grids[i]) return;

            var resolution = 4;
            var px = sm.px([lon,lat], d.zoom);
            var y = Math.floor((px[1] % 256) / resolution);
            var x = Math.floor((px[0] % 256) / resolution)
            var code = resolveCode(grids[i].grid[y].charCodeAt(x));
            var key = grids[i].keys[code];

            if (key) {
                var data = grids[i].data[key];
                context.push({
                    name: data.name,
                    lon: data.lon,
                    lat: data.lat,
                    type: type
                });
            }
        });
        return callback(null, context);
    });
};

Carmen.prototype.geocode = function(query, callback) {
    if (!_(this.db).all(function(d) { return d.source.open }))
        return callback(new Error('DB not open.'));

    var db = this.db;
    var types = Object.keys(db);
    var data = { query: this.tokenize(query) };
    var carmen = this;

    Step(function() {
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
                // data type.
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
        var zooms = _(db).chain().pluck('zoom').uniq().sortBy().value();
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

        data.results = _(rows).chain()
            .compact()
            .map(function(r) { return _(r).defaults(JSON.parse(r.data)) })
            .sortBy(function(t) { return t.rank || 0 })
            .reverse()
            .map(function(t) {
                return {
                    name: t.name,
                    type: t.id.split('.')[0],
                    lon: t.lon,
                    lat: t.lat,
                    rank: t.rank || 0
                };
            })
            .value();

        var group = this.group();
        _(data.results).each(function(t) {
            var next = group();
            carmen.context(t.lon, t.lat, function(err, context) {
                if (err) return next(err);
                context = _(context).filter(function(term) {
                    return types.indexOf(term.type) < types.indexOf(t.type);
                }).reverse();
                if (context.length) t.context = context;
                return next();
            });
        });
    }, function(err) {
        if (err) return callback(err);
        return callback(null, data);
    });
};

module.exports = Carmen;

