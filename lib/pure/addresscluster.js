module.exports = function(feature, address) {

    var cluster = feature._cluster;

    if (!cluster[address]) return;

    return {
        type:'Point',
        coordinates: [
            cluster[address].geometry.coordinates[0],
            cluster[address].geometry.coordinates[1]
        ].map(function(v) {
            return Math.round(v*1e6) / 1e6;
        })
    };
};
