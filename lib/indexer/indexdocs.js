// var docsworker = require('./indexdocs-worker');
var mp32 = Math.pow(2,32);
var cover = require('tile-cover');
var ops = require('../util/ops');
var grid = require('../util/grid');
var token = require('../util/token');
var termops = require('../util/termops');
var tilebelt = require('tilebelt');
var centroid = require('turf-point-on-surface');
var DEBUG = process.env.DEBUG;
var uniq = require('../util/uniq');
var extent = require('turf-extent');
var point = require('turf-point');
var linestring = require('turf-linestring');
var geojsonHint = require('geojsonhint');
var token = require('../util/token');
var TIMER = process.env.TIMER;

module.exports = {};
module.exports = indexdocs;
module.exports.loadDoc = loadDoc;
module.exports.runChecks = runChecks;
module.exports.verifyCenter = verifyCenter;
module.exports.generateFrequency = generateFrequency;

function indexdocs(docs, source, zoom, geocoder_tokens, callback) {
    if (typeof zoom !== 'number')
        return callback(new Error('index has no zoom'));
    if (zoom < 0)
        return callback(new Error('zoom must be greater than 0 --- zoom was '+zoom));
    if (zoom > 14)
        return callback(new Error('zoom must be less than 15 --- zoom was '+zoom));
    if (typeof callback !== 'function')
        return callback(new Error('callback required'));

    var full = { grid: {}, text:[], docs:[], vectors:[] };
    var settings = {source:source, zoom:zoom, geocoder_tokens:geocoder_tokens};

    function error(err) {
        if (!callback) return;
        callback(err);
        callback = false;
    }

    var err = parseDocs(docs, settings, full);
    if (err) {
        return error(new Error(err));
    }

    if (TIMER) console.time('update:freq');
    try {
        var freq = generateFrequency(docs, source.token_replacer);
    } catch (err) {
        return callback(err);
    }

    if (TIMER) console.timeEnd('update:freq');

    // Do this within each shard worker.
    var getter = source.getGeocoderData.bind(source);

    // Ensures all shards are loaded.
    if (TIMER) console.time('update:loadall');
    var ids = Object.keys(freq).map(function(v) { return parseInt(v, 10); });
    source._geocoder.loadall(getter, 'freq', ids, function(err) {
        if (err) return callback(err);
        for (var i = 0; i < ids.length; i++) {
            var id = ids[i];
            freq[id][0] = (source._geocoder.get('freq', id) || [0])[0] + freq[id][0];
            // maxscore should not be cumulative.
            if (id === 1) {
                freq[id][0] = (source._geocoder.get('freq', id) || [0,0])[0] || freq[id][0];
            }
            source._geocoder.set('freq', id, freq[id]);
        }
        if (TIMER) console.timeEnd('update:loadall');
        if (TIMER) console.time('update:indexdocs');

        for (f_it = 0; f_it < docs.length; f_it++) {
            loadDoc(freq, full, docs[f_it], source, zoom, source.token_replacer)
        }

        callback(null, full);
    });
}

function parseDocs(docs, settings, full) {
    var source = settings.source;
    var zoom = settings.zoom;
    var token_replacer = token.createReplacer(settings.geocoder_tokens);

    for (var i = 0; i < docs.length; i++) {
        var res = standardize(full, docs[i], source, zoom, token_replacer);
        if (typeof res === 'string') {
            return res;
        } else docs[i] = res;

        //Create vectorizable version of doc
        if (docs[i].properties['carmen:addressnumber']) {
            docs[i].properties.id = docs[i].id;
            for (var c_it = 0; c_it < docs[i].properties['carmen:addressnumber'].length; c_it++) {
                for (var addr_it = 0; addr_it < docs[i].properties['carmen:addressnumber'][c_it].length; addr_it++) {
                    var feat = JSON.parse(JSON.stringify(docs[i]));
                    feat.properties['carmen:addressnumber'] = feat.properties['carmen:addressnumber'][c_it][addr_it];
                    feat.properties['carmen:center'] = feat.geometry.geometries[c_it].coordinates[addr_it];
                    feat = point(feat.geometry.geometries[c_it].coordinates[addr_it], feat.properties);
                    feat.id = feat.properties.id;
                    full.vectors.push(feat);
                }
            }
        }
        if (docs[i].properties['carmen:rangetype']) {
            for (var c_it = 0; c_it < docs[i].properties['carmen:addressnumber'].length; c_it++) {
                for (var addr_it = 0; addr_it < docs[i].geometry.coordinates[c_it].length; addr_it++) {
                    var feat = JSON.parse(JSON.stringify(docs[i]));
                    if (feat.properties['carmen:parityl']) feat.properties['carmen:parityl'][c_it] = [feat.properties['carmen:parityl'][c_it][addr_it]]
                    if (feat.properties['carmen:parityr']) feat.properties['carmen:parityr'][c_it] = [feat.properties['carmen:parityr'][c_it][addr_it]]
                    if (feat.properties['carmen:lfromhn']) feat.properties['carmen:lfromhn'][c_it] = [feat.properties['carmen:lfromhn'][c_it][addr_it]]
                    if (feat.properties['carmen:rfromhn']) feat.properties['carmen:rfromhn'][c_it] = [feat.properties['carmen:rfromhn'][c_it][addr_it]]
                    if (feat.properties['carmen:ltohn']) feat.properties['carmen:ltohn'][c_it] = [feat.properties['carmen:ltohn'][c_it][addr_it]]
                    if (feat.properties['carmen:rtohn']) feat.properties['carmen:rtohn'][c_it] = [feat.properties['carmen:rtohn'][c_it][addr_it]]
                    feat.properties.id = feat.id;
                    feat = linestring(feat.geometry.coordinates[c_it][addr_it], feat.properties);
                    feat.properties['carmen:center'] = centroid(feat.geometry).geometry.coordinates;
                    feat.id = feat.properties.id;
                    full.vectors.push(feat);
                }
            }
        } else {
            docs[i].properties.id = docs[i].id;
            full.vectors.push(docs[i])
        }
    }
};

function runChecks(doc, zoom) {
    var geojsonErr = geojsonHint.hint(doc);

    if (!doc.id) {
        return 'doc has no id';
    } else if (geojsonErr.length) {
        return geojsonErr[0].message + ' on id:' + doc.id;
    } else if (!doc.properties) {
        return 'doc has no properties on id:' + doc.id;
    } else if (!doc.properties["carmen:text"]) {
        return 'doc has no carmen:text on id:' + doc.id;
    } else if (doc.properties["carmen:geocoder_stack"] &&
        typeof doc.properties["carmen:geocoder_stack"] !== 'string') {
        return 'geocoder_stack must be a string value';
    }

    if (doc.geometry.type === 'Polygon' || doc.geometry.type === 'MultiPolygon') {
        // check for Polygons or Multipolygons with too many vertices
        var vertices = 0;
        if (doc.geometry.type === 'Polygon') {
            var ringCount = doc.geometry.coordinates.length;
            for (var i = 0; i < ringCount; i++) {
                vertices+= doc.geometry.coordinates[i].length;
            }
        } else {
            var polygonCount = doc.geometry.coordinates.length;
            for (var k = 0; k < polygonCount; k++) {
                var ringCount = doc.geometry.coordinates[k].length;
                for (var i = 0; i < ringCount; i++) {
                    vertices += doc.geometry.coordinates[k][i].length;
                }
            }
        }
        if (vertices > 50000) {
            return 'Polygons may not have more than 50k vertices. Simplify your polygons, or split the polygon into multiple parts on id:' + doc.id;
        }
    }
    return '';
}

function standardize(patch, doc, source, zoom, token_replacer) {
    var err = runChecks(doc, zoom);
    if (err) return err;

    var tiles = [];
    if (!doc.properties['carmen:zxy']) {
        tiles = cover.tiles(doc.geometry, {min_zoom: zoom, max_zoom: zoom});
        doc.properties['carmen:zxy'] = [];
        tiles.forEach(function(tile) {
            doc.properties['carmen:zxy'].push(tile[2]+'/'+tile[0]+'/'+tile[1]);
        });
    } else {
        doc.properties['carmen:zxy'].forEach(function(tile) {
            tile = tile.split('/')
            tiles.push([tile[1], tile[2], tile[0]]);
        });
    }

    if (!doc.properties["carmen:center"] || !verifyCenter(doc.properties["carmen:center"], tiles)) {
        console.warn('carmen:center did not fall within the provided geometry for %s (%s). Calculating new point on surface.',
            doc.id, doc.properties["carmen:text"]);
        doc.properties["carmen:center"] = centroid(doc.geometry).geometry.coordinates;
        if (!verifyCenter(doc.properties["carmen:center"], tiles)) {
            return 'Invalid carmen:center provided, and unable to calculate corrected centroid. Verify validity of doc.geometry for doc id:' + doc.id;
        } else {
            console.warn('new: carmen:center: ', doc.properties["carmen:center"]);
            console.warn('new: zxy:    ', doc.properties['carmen:zxy']);
        }
    }

    //All values in an addresscluster should be lowercase so that the lowercased input query always matches the addresscluster
    //All addressnumber type features are also converted into GeometryCollections
    if (doc.properties['carmen:addressnumber']) {
        if (doc.geometry.type === 'MultiPoint') {
            doc.properties['carmen:addressnumber'] = [doc.properties['carmen:addressnumber']]
            doc.geometry = {
                type: 'GeometryCollection',
                geometries: [
                    doc.geometry
                ]
            }
        }

        if (doc.properties['carmen:addressnumber'].length !== doc.geometry.geometries.length) {
            return 'carmen:addressnumber array must be equal to geometry.geometries array';
        }

        for (var c_it = 0; c_it < doc.properties['carmen:addressnumber'].length; c_it++) {
            if (!doc.properties['carmen:addressnumber'][c_it] || !doc.properties['carmen:addressnumber'][c_it].length) continue;

            if (doc.properties['carmen:addressnumber'][c_it].length !== doc.geometry.geometries[c_it].coordinates.length) {
                return 'carmen:addressnumber[i] array must be equal to geometry.geometries[i] array';
            }
            if (doc.geometry.geometries[c_it].type !== 'MultiPoint') {
                return 'non-null carmen:addressnumbers must parallel with MultiPoint geometries in GeometryCollection';
            }

            for (var addr_it = 0; addr_it < doc.properties['carmen:addressnumber'][c_it].length; addr_it++) {
                doc.properties['carmen:addressnumber'][c_it][addr_it] =
                    typeof doc.properties['carmen:addressnumber'][c_it][addr_it] === 'string' ?
                    doc.properties['carmen:addressnumber'][c_it][addr_it].toLowerCase() :
                    doc.properties['carmen:addressnumber'][c_it][addr_it];
            }
        }
    }

    //All ITP (like PT) are converted to GeometryCollections internally
    if (doc.properties['carmen:rangetype']) {
        if (doc.geometry.type === 'LineString' || doc.geometry.type === 'MultiLineString') {
            ['parityl', 'parityr', 'lfromhn', 'rfromhn', 'ltohn', 'rtohn'].forEach(function(type) {
                doc.properties['carmen:'+type] = doc.geometry.type === 'LineString' ?  [[doc.properties['carmen:'+type]]] : [doc.properties['carmen:'+type]];
            });

            doc.geometry = {
                type: 'GeometryCollection',
                geometries: [{
                    type: 'MultiLineString',
                    coordinates: doc.geometry.type === 'LineString' ? [doc.geometry.coordinates] : doc.geometry.coordinates
                }]
            }
        } else if (doc.geometry.type !== 'GeometryCollection') {
            return 'ITP results must be a LineString, MultiLineString, or GeometryCollection';
        }
    }

    if (!doc.bbox && (doc.geometry.type === 'MultiPolygon' || doc.geometry.type === 'Polygon')) {
        doc.bbox = extent(doc.geometry);
    }

    // zxy must be set at this point
    if (!doc.properties['carmen:zxy']) {
        return 'doc.properties[\'carmen:zxy\'] undefined, failed indexing, doc id:' + doc.id;
    }

    // Limit carmen:zxy length
    if (doc.properties['carmen:zxy'] && doc.properties['carmen:zxy'].length > 10000) {
        return 'zxy exceeded 10000, doc id:' + doc.id;
    }

    doc.properties['carmen:hash'] = termops.feature(doc.id.toString());

    return doc;
}

function loadDoc(freq, patch, doc, source, zoom, token_replacer) {
    var xy = [];
    var l = doc.properties['carmen:zxy'].length;
    while (l--) {
        var zxy = doc.properties['carmen:zxy'][l].split('/');
        zxy[1] = parseInt(zxy[1],10);
        zxy[2] = parseInt(zxy[2],10);
        if (zxy[1] < 0 || zxy[2] < 0) continue;
        xy.push({ x:zxy[1], y:zxy[2] });
    }

    var maxScore = freq[1][0] || 0;
    var texts = termops.getIndexableText(token_replacer, doc);
    var phraseUniq = {};
    for (var x = 0; x < texts.length; x++) {
        var phrases = termops.getIndexablePhrases(texts[x], freq);
        for (var y = 0; y < phrases.length; y++) {
            var phrase = phrases[y].phrase;

            // Make sure the phrase is only counted once per doc.
            // Synonyms and other multiple text situations can
            // create dupe phrases.
            if (phraseUniq[phrase]) continue;
            phraseUniq[phrase] = true;

            if (DEBUG && !phrases[y].degen) {
                console.warn('[%d] phrase: %s @ %d', doc.id, phrases[y].text, phrases[y].relev);
            }

            patch.grid[phrase] = patch.grid[phrase] || [];
            if (!phrases[y].degen) patch.text.push(phrases[y].text);

            l = xy.length
            while (l--) {
                var encoded = null;
                try {
                    encoded = grid.encode({
                        id: doc.properties['carmen:hash'],
                        x: xy[l].x,
                        y: xy[l].y,
                        relev: phrases[y].relev,
                        score: Math.ceil(7*(doc.properties["carmen:score"] || 0)/(maxScore||1))
                    });
                } catch (err) {
                    console.warn(err.toString() + ', doc id: ' + doc.id);
                }
                if (encoded) patch.grid[phrase].push(encoded);
            }
        }
    }

    patch.docs.push(doc);

    return doc;
}

function verifyCenter(center, tiles) {
    var found = false;
    var i = 0;
    while (!found && i < tiles.length) {
        var bbox = tilebelt.tileToBBOX(tiles[i]);
        if (center[0] >= bbox[0] && center[0] <= bbox[2] && center[1] >= bbox[1] && center[1] <= bbox[3]) {
            found = true;
        }
        i++;
    }
    return found;
}

function generateFrequency(docs, replacer) {
    var freq = {};

    // Uses freq[0] as a convention for storing total # of docs.
    // Reserved for this use by termops.encodeTerm
    freq[0] = [0];

    // Uses freq[1] as a convention for storing max score.
    // Reserved for this use by termops.encodeTerm
    freq[1] = [0];

    for (var i = 0; i < docs.length; i++) {
        if (!docs[i].properties["carmen:text"]) {
            throw new Error('doc has no carmen:text');
        }

        // set max score
        freq[1][0] = Math.max(freq[1][0], docs[i].properties["carmen:score"] || 0);

        var texts = termops.getIndexableText(replacer, docs[i]);
        for (var x = 0; x < texts.length; x++) {
            var terms = termops.terms(texts[x]);
            for (var k = 0; k < terms.length; k++) {
                var id = terms[k];
                freq[id] = freq[id] || [0];
                freq[id][0]++;
                freq[0][0]++;
            }
        }
    }

    return freq;
}
