var cover = require('tile-cover');
var ops = require('../util/ops');
var termops = require('../util/termops');
var DEBUG = process.env.DEBUG;

var freq;
var known = { term:{} };
process.once('message', function(data) {
    freq = data;
    process.on('message', function(doc) {
        process.send(loadDoc(doc, freq, known));
    });
});

function loadDoc(doc, freq, known) {
    var patch = { grid: {}, term: {}, phrase: {}, degen: {} };

    if (!doc._zxy || !doc._zxy.length) {
        var tiles = cover.tiles(doc._geometry, {min_zoom: 6, max_zoom: 6});
        
        doc._zxy = [];
        for (var i = 0; i < tiles.length; i++) {
            doc._zxy.push(tiles[i][2]+'/'+tiles[i][0]+'/'+tiles[i][1]);
        }
    }

    doc._hash = termops.feature(doc._id.toString());
    doc._grid = doc._grid || [];
    if (doc._zxy) for (var i = 0; i < doc._zxy.length; i++) {
        doc._grid.push(ops.zxy(doc._hash, doc._zxy[i]));
    }

    var texts = doc._text.split(',');
    var termsets = [];
    var termsmaps = [];
    var tokensets = [];
    for (var x = 0; x < texts.length; x++) {
        var tokens = termops.tokenize(texts[x]);
        if (!tokens.length) continue;
        termsets.push(termops.termsWeighted(tokens, freq));
        termsmaps.push(termops.termsMap(tokens));
        tokensets.push(tokens);
    }

    for (var x = 0; x < termsets.length; x++) {
        var terms = termsets[x];
        var sigid = null;
        var sigweight = 0;
        var termsmap = termsmaps[x];

        for (var i = 0; i < terms.length; i++) {
            // Decode the term id, weight from weighted terms.
            var id = terms[i] >>> 4 << 4 >>> 0;
            var weight = terms[i] % 16;
            if (weight > sigweight) {
                sigid = id;
                sigweight = weight;
            }

            // This check avoids doing redundant work for a term once
            // it is known to be indexed. @TODO known issue, this prevents
            // degens from being used as an approach to avoiding fnv1a term
            // collisions.
            if (known.term[id]) continue;
            known.term[id] = true;

            // Degenerate terms are indexed for all terms
            // (not just significant ones).
            var degens = termops.degens(termsmap[id]);
            for (var j = 0; j < degens.length; j = j+2) {
                var d = degens[j];
                patch.degen[d] = patch.degen[d] || [];
                patch.degen[d].push(degens[j+1]);
            }
        }

        // Generate phrase, clustered by most significant term.
        var phrase = termops.phrase(tokensets[x], termsmap[sigid]);
        patch.phrase[phrase] = patch.phrase[phrase] || terms;
        patch.term[sigid] = patch.term[sigid] || [];
        patch.term[sigid].push(phrase);
        patch.grid[phrase] = patch.grid[phrase] || [];
        patch.grid[phrase].push.apply(patch.grid[phrase], doc._grid);

        // Debug significant term selection.
        if (DEBUG) {
            var debug = termsmap;
            var oldtext = terms.map(function(id) {
                id = id >>> 4 << 4 >>> 0;
                return debug[id];
            }).join(' ');
            var sigtext = debug[sigid];
            if (oldtext !== sigtext)  console.log('%s => %s', oldtext, sigtext);
        }
    }

    patch.docs = doc;
    return patch;
}

