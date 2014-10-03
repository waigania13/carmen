var full = { grid: {}, term: {}, phrase: {}, degen: {}, docs:[] };
var types = Object.keys(full);

process.on('message', function(patch) {
    if (patch === 'finish') {
        return process.send(full);
    }
    for (var i = 0; i < types.length; i++) {
        var type = types[i];
        for (var k in patch[type]) {
            if (type === 'docs') {
                full.docs.push(patch.docs);
            } else {
                full[type][k] = full[type][k] || [];
                full[type][k].push.apply(full[type][k], patch[type][k]);
            }
        }
    }
});

