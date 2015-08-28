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

var freq;
var zoom;
var token_replacer;

module.exports = {};
module.exports.runChecks = runChecks;
module.exports.loadDoc = loadDoc;
module.exports.verifyCenter = verifyCenter;

process.on('message', function(data) {
    if (data.freq && data.zoom && data.geocoder_tokens) {
        freq = data.freq;
        zoom = data.zoom;
        token_replacer = token.createReplacer(data.geocoder_tokens);
    } else {
        var patch = { grid: {}, docs: [] };
        for (var i = 0; i < data.length; i++) {
            var err = loadDoc(patch, data[i], freq, zoom, token_replacer);
            if (err) return process.send(err);
        }
        process.send(patch);
    }
});

function runChecks(doc, zoom) {
    if (!doc.id) {
        return 'doc has no id';
    } else if (!doc.geometry) {
        return 'doc has no geometry';
    } else if (!doc.properties["carmen:text"]) {
        return 'doc has no carmen:text on id:' + doc.id;
    } else if (!doc.properties["carmen:center"]) {
        return 'doc has no carmen:center on id:' + doc.id;
    }

    if (doc.geometry.type === 'Polygon' || doc.geometry.type === 'MultiPolygon') {
        // check for Polygons or Multipolygons with too many vertices
        var vertices = 0;
        if (doc.geometry.type === 'Polygon'){
            var ringCount = doc.geometry.coordinates.length;
            for (var i = 0; i < ringCount; i++) {
                vertices+= doc.geometry.coordinates[i].length;
            }
        } else {
            var polygonCount = doc.geometry.coordinates.length;
            for(var k = 0; k < polygonCount; k++) {
                var ringCount = doc.geometry.coordinates[k].length;
                for (var i = 0; i < ringCount; i++) {
                    vertices += doc.geometry.coordinates[k][i].length;
                }
            }
        }
        if (vertices > 50000){
            return 'Polygons may not have more than 50k vertices. Simplify your polygons, or split the polygon into multiple parts on id:' + doc.id;
        }
    }
    return '';
}

function loadDoc(patch, doc, freq, zoom, token_replacer) {
    var err = runChecks(doc, zoom);
    if (err) return err;

    var tiles;
    tiles = cover.tiles(doc.geometry, {min_zoom: zoom, max_zoom: zoom});
    doc._zxy = [];
    tiles.forEach(function(tile){
        doc._zxy.push(tile[2]+'/'+tile[0]+'/'+tile[1]);
    });
    if(!doc.properties["carmen:center"] || !verifyCenter(doc.properties["carmen:center"], tiles)) {
        console.warn('carmen:center did not fall within the provided geometry for %s (%s). Calculating new point on surface.',
            doc.id, doc.properties["carmen:text"]);
        doc.properties["carmen:center"] = centroid(doc.geometry).geometry.coordinates;
        if(!verifyCenter(doc.properties["carmen:center"], tiles)) {
            return 'Invalid carmen:center provided, and unable to calculate corrected centroid. Verify validity of doc._geometry for doc id:' + doc.id;
        } else {
            console.warn('new: carmen:center: ', doc.properties["carmen:center"]);
            console.warn('new: doc._zxy:    ', doc._zxy);
        }
    }

    // doc._zxy must be set at this point
    if (!doc._zxy) {
        return 'doc._zxy undefined, failed indexing, doc id:' + doc.id;
    }

    // Limit doc._zxy length
    if (doc._zxy && doc._zxy.length > 10000) {
        return 'doc._zxy exceeded 10000, doc id:' + doc.id;
    }

    doc._hash = termops.feature(doc.id.toString());

    var xy = [];
    var l = doc._zxy.length;
    while (l--) {
        var zxy = doc._zxy[l].split('/');
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

            l = xy.length
            while (l--) {
                var encoded = null;
                try {
                    encoded = grid.encode({
                        id: doc._hash,
                        x: xy[l].x,
                        y: xy[l].y,
                        relev: phrases[y].relev,
                        score: Math.ceil(7*(doc.properties["carmen:score"] || 0)/(maxScore||1))
                    });
                } catch(err) {
                    console.warn(err.toString() + ', doc id: ' + doc.id);
                }
                if (encoded) patch.grid[phrase].push(encoded);
            }
        }
    }

    patch.docs.push(doc);
}

function verifyCenter(center, tiles) {
    var found = false;
    var i = 0;
    while(!found && i < tiles.length) {
        var bbox = tilebelt.tileToBBOX(tiles[i]);
        if(center[0] >= bbox[0] && center[0] <= bbox[2] && center[1] >= bbox[1] && center[1] <= bbox[3]) {
            found = true;
        }
        i++;
    }
    return found;
}
