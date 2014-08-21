module.exports = function(feature, address) {

    var cluster = feature._cluster;

    console.log("HERE");

    //Check if park exists
    if (!cluster[address]) return;

    //Check is cluster is pt geom
    if (
        cluster[address].type != "Point" &&
        cluster[address].coordinates.length == 2
    ) return;

    return {
        type:'Point',
        coordinates: [
            cluster[address].coordinates[0],
            cluster[address].coordinates[1]
        ].map(function(v) {
            return Math.round(v*1e6) / 1e6;
        })
    };
};
