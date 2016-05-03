// var fork = require('child_process').fork;
// var cpus = require('os').cpus().length;
var docsworker = require('./indexdocs-worker');
var token = require('../util/token');
var TIMER = process.env.TIMER;
// var workers = [];
module.exports = indexdocs;
// module.exports.teardown = teardown;

function indexdocs(docs, freq, zoom, geocoder_tokens, callback) {
    if (typeof zoom !== 'number')
        return callback(new Error('index has no zoom'));
    if (zoom < 0)
        return callback(new Error('zoom must be greater than 0 --- zoom was '+zoom));
    if (zoom > 14)
        return callback(new Error('zoom must be less than 15 --- zoom was '+zoom));

    var remaining = docs.length;
    var full = { grid: {}, text:[], docs:[], vectors:[] };
    var types = Object.keys(full);
    // var patches = [];
    var workerPatch;

    function error(err) {
        if (!callback) return;
        callback(err);
        callback = false;
    }

    // // Setup workers.
    // if (TIMER) console.time('indexdocs:setup');
    // for (var i = 0; i < cpus; i++) {
        // where to find the worker code
    //     workers[i] = workers[i] || fork(__dirname + '/indexdocs-worker.js');
        // what to send the workers
    //     workers[i].send({
    //         freq:freq,
    //         zoom:zoom,
    //         geocoder_tokens:geocoder_tokens
    //     });
    //     workers[i].removeAllListeners('exit');
    //     workers[i].on('exit', exit);
    //     workers[i].removeAllListeners('message');
    //     workers[i].on('message', function(patch) {
                // if what we get back is a string, it's an error msg, return it
    //         if (typeof patch === 'string') return error(new Error(patch));
                // add patches onto patch, if patches gets too long handle it
    //         patches.push(patch);
    //         if (patches.length >= 10000) {
    //             if (TIMER) console.time('indexdocs:processPatch');
                // run processPatch on each patch
    //             while (patches.length) processPatch(patches.shift(), types, full);
    //             if (TIMER) console.timeEnd('indexdocs:processPatch');
    //         }
    //         remaining = remaining - patch.docs.length;
    //         if (!remaining) {
    //             while (patches.length) processPatch(patches.shift(), types, full);
    //             callback && callback(null, full);
    //         }
    //     });
    // }
    // if (TIMER) console.timeEnd('indexdocs:setup');

    // catch errors returned from formerWorker
    // workerPatch = formerWorker(docs, {freq:freq, zoom:zoom, geocoder_tokens:geocoder_tokens}, full);
    // if (typeof workerPatch === 'string') {
    //     return error(new Error(workerPatch));
    // } else {
    //     // patches = workerPatch;
    // }

    var err = formerWorker(docs, {freq:freq, zoom:zoom, geocoder_tokens:geocoder_tokens}, full);
    if (err) {
        console.log('error caught \n');
        return error(new Error(err));
    }

    callback && callback(null, full);
}

function formerWorker(data, settings, full) {
    var freq = settings.freq;
    var zoom = settings.zoom;
    var token_replacer = token.createReplacer(settings.geocoder_tokens);
    // var patch = { grid: {}, docs: [], text: [], vectors: [] };

    for (var i = 0; i < data.length; i++) {
        var err = docsworker.loadDoc(full, data[i], freq, zoom, token_replacer);
        if (err) {
            console.log('\nerror from loadDoc');
            return err;
        };

        //Create vectorizable version of doc
        if (data[i].properties['carmen:addressnumber']) {
            data[i].properties.id = data[i].id;
            for (var addr_it = 0; addr_it < data[i].properties['carmen:addressnumber'].length; addr_it++) {
                var feat = JSON.parse(JSON.stringify(data[i]));
                feat.properties['carmen:addressnumber'] = feat.properties['carmen:addressnumber'][addr_it];
                feat.properties['carmen:center'] = feat.geometry.coordinates[addr_it];
                feat = point(feat.geometry.coordinates[addr_it], feat.properties);
                feat.id = feat.properties.id;
                full.vectors.push(feat);
            }
        } else if (data[i].properties['carmen:rangetype'] && data[i].geometry.type === 'MultiLineString') {
            for (var addr_it = 0; addr_it < data[i].geometry.coordinates.length; addr_it++) {
                var feat = JSON.parse(JSON.stringify(data[i]));
                if (feat.properties['carmen:parityl']) feat.properties['carmen:parityl'] = [feat.properties['carmen:parityl'][addr_it]]
                if (feat.properties['carmen:parityr']) feat.properties['carmen:parityr'] = [feat.properties['carmen:parityr'][addr_it]]
                if (feat.properties['carmen:lfromhn']) feat.properties['carmen:lfromhn'] = [feat.properties['carmen:lfromhn'][addr_it]]
                if (feat.properties['carmen:rfromhn']) feat.properties['carmen:rfromhn'] = [feat.properties['carmen:rfromhn'][addr_it]]
                if (feat.properties['carmen:ltohn']) feat.properties['carmen:ltohn'] = [feat.properties['carmen:ltohn'][addr_it]]
                if (feat.properties['carmen:rtohn']) feat.properties['carmen:rtohn'] = [feat.properties['carmen:rtohn'][addr_it]]
                feat.properties.id = feat.id;
                feat = linestring(feat.geometry.coordinates[addr_it], feat.properties);
                feat.properties['carmen:center'] = centroid(feat.geometry).geometry.coordinates;
                feat.id = feat.properties.id;
                full.vectors.push(feat);
            }
        } else {
            data[i].properties.id = data[i].id;
            full.vectors.push(data[i])
        }
    }
    // return full;
};

// // pushing info onto full, initialized in indexdocs
// function processPatch(patch, types, full) {
//     full.docs.push.apply(full.docs, patch.docs);
//     full.text.push.apply(full.text, patch.text);
//     full.vectors.push.apply(full.vectors, patch.vectors);

//     for (var i = 0; i < types.length; i++) {
//         var type = types[i];

//         if (type === 'grid') {
//             for (var k in patch[type]) {
//                 full[type][k] = full[type][k] || [];
//                 full[type][k].push.apply(full[type][k], patch[type][k]);
//             }
//         }
//     }
// }
