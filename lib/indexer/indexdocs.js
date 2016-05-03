var docsworker = require('./indexdocs-worker');
var token = require('../util/token');

module.exports = indexdocs;
module.exports.teardown = teardown;

function indexdocs(docs, freq, zoom, geocoder_tokens, callback) {
    if (typeof zoom !== 'number')
        return callback(new Error('index has no zoom'));
    if (zoom < 0)
        return callback(new Error('zoom must be greater than 0 --- zoom was '+zoom));
    if (zoom > 14)
        return callback(new Error('zoom must be less than 15 --- zoom was '+zoom));

    var full = { grid: {}, text:[], docs:[], vectors:[] };

    function error(err) {
        if (!callback) return;
        callback(err);
        callback = false;
    }

    var err = formerWorker(docs, {freq:freq, zoom:zoom, geocoder_tokens:geocoder_tokens}, full);
    if (err) {
        return error(new Error(err));
    }
    callback && callback(null, full);
}

function formerWorker(data, settings, full) {
    var freq = settings.freq;
    var zoom = settings.zoom;
    var token_replacer = token.createReplacer(settings.geocoder_tokens);

    for (var i = 0; i < data.length; i++) {
        var err = docsworker.loadDoc(full, data[i], freq, zoom, token_replacer);
        if (err) {
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
};

function teardown() {
    while (workers.length) {
        workers.shift().kill('SIGHUP');
    }
}
