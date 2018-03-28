'use strict';
const Carmen = require('../index.js');
const queue = require('d3-queue').queue;
const merge = require('../lib/merge.js');

process.on('message', (data) => {
    // resolve sources
    const q = queue();
    const inputConfs = [];
    let outputConf;
    [data.from1File, data.from2File].forEach((input) => {
        q.defer((input, callback) => {
            const auto = Carmen.auto(input, () => {
                const conf = {
                    from: auto
                };

                inputConfs.push(conf);
                callback();
            });
        }, input);
    });
    q.defer((callback) => {
        merge.getOutputConf(data.mergeToFile, data.options, (_oc) => {
            outputConf = _oc;
            callback();
        });
    });
    q.awaitAll(() => {
        const carmens = [new Carmen(inputConfs[0]), new Carmen(inputConfs[1]), new Carmen(outputConf)];
        const openq = queue();
        carmens.forEach((carmen) => { openq.defer((callback) => {
            carmen.on('open', callback);
        });});
        openq.awaitAll(() => {
            console.log('# starting merge of ' + inputConfs[0].from._original.filename + ' and ' +
                inputConfs[1].from._original.filename + ' into ' + outputConf.to._original.filename
            );
            carmens[2].merge(inputConfs[0].from, inputConfs[1].from, outputConf.to, data.options, (err) => {
                if (err) throw err;

                console.log('# completed merge of ' + inputConfs[0].from._original.filename + ' and ' +
                    inputConfs[1].from._original.filename + ' into ' + outputConf.to._original.filename
                );

                process.exit(0);
            });
        });
    });
});
