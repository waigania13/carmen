module.exports = function(feature, address) {

    var cluster;
    if (typeof feature._cluster === "string" )
        cluster = JSON.parse(feature._cluster);
    else
        cluster = feature._cluster;

    //Check if point exists
    if (!cluster[address]) return;

    //Check is cluster is pt geom
    var geom;

    if (typeof cluster[address] === "string")
        geom = JSON.parse(cluster[address]);
    else
        geom = cluster[address];

    if (
        geom.type !== "Point" ||
        geom.coordinates.length !== 2
    ) return;

    return {
        type:'Point',
        coordinates: [
            geom.coordinates[0],
            geom.coordinates[1]
        ].map(function(v) {
            return Math.round(v*1e6) / 1e6;
        })
    };
};
