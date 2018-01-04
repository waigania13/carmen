#!/usr/bin/env node

const fs = require('fs');
const split = require('split');
const termops = require('../lib/util/termops.js');
const indexdocs = require('../lib/indexer/indexdocs.js');
const grid = require('../lib/util/grid.js');
const tape = require('tape');
const token = require('../lib/util/token.js');
const rewind = require('geojson-rewind');
const addrTransform = require('../lib/util/feature.js').addrTransform;

let token_replacer = token.createReplacer({});

process.stdin
    .pipe(split())
    .on('data', function(element) {
        if (!element) {
            return;
        }
        // console.log(element);

        let patch;
        let freq;
        let zoom;
        let doc;
        let err;

        patch = { grid:{}, docs:[], text:[] };
        freq = {};
        zoom = 12;

        doc = JSON.parse(element);
        doc.properties['carmen:zxy'] = ['6/32/32', '6/33/33'];
        doc.properties['carmen:score'] = 100;

        freq["__COUNT__"] = [0];
        freq["__MAX__"] = [0];

        doc = addrTransform(doc);

        // Indexes single doc.
        err = indexdocs.loadDoc(freq, patch, doc, { lang: { has_languages: false } }, zoom, token_replacer);

        if (patch.text.length > 1000) {
            // console.log(patch.text);
            console.log(patch.text.length);
        }

    });
