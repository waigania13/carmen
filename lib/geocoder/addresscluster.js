'use strict';
module.exports.forward = forward;
module.exports.forwardPrefix = forwardPrefix;
module.exports.reverse = reverse;

function forward(feature, address) {
    if (!feature.geometry || feature.geometry.type !== 'GeometryCollection') return false;

    // Check both forms of the address (raw, number-parsed)
    const a1 = typeof address === 'string' ? address.toLowerCase() : address;
    const a2 = typeof address === 'string' ? address.replace(/\D/, '') : address;

    const cluster = feature.properties['carmen:addressnumber'];

    for (let c_it = 0; c_it < cluster.length; c_it++) {
        if (!cluster[c_it]) continue;

        // this code identifies all the indexes of cluster[c_it] that have a1 or, if that fails, a2
        // equivalent approximately to python [i for i,e in enumerate(cluster[c_it]) if e == a1]
        // expressed as a reduction starting with an empty array `a` that, if the value e at each step
        // `e` is equal to `a1`, gets the current index `i` appended to it
        // more info at https://stackoverflow.com/questions/20798477/how-to-find-index-of-all-occurrences-of-element-in-array#comment69744472_20798754
        let a_index = cluster[c_it].reduce((a, e, i) => { return (e === a1) ? a.concat(i) : a; }, []);
        if (!a_index.length) a_index = cluster[c_it].reduce((a, e, i) => { return (e === a2) ? a.concat(i) : a; }, []);

        // Check is cluster is pt geom
        if (a_index.length && feature.geometry.geometries[c_it].type === 'MultiPoint') {
            return a_index.map((idx) => {
                return {
                    type:'Point',
                    coordinates: [
                        Math.round(feature.geometry.geometries[c_it].coordinates[idx][0] * 1e6) / 1e6,
                        Math.round(feature.geometry.geometries[c_it].coordinates[idx][1] * 1e6) / 1e6
                    ]
                };
            });
        }
    }

    return false;
}

function forwardPrefix(feature, address) {
    if (!feature.geometry || feature.geometry.type !== 'GeometryCollection') return false;

    // Check both forms of the address (raw, number-parsed)
    const a1 = typeof address === 'string' ? address.toLowerCase() : ('' + address).toLowerCase();

    const cluster = feature.properties['carmen:addressnumber'];

    for (let c_it = 0; c_it < cluster.length; c_it++) {
        if (!cluster[c_it]) continue;

        // this code identifies all the indexes of cluster[c_it] that start with a1
        // similar to the above plan forward
        let a_index = cluster[c_it].reduce((a, e, i) => {
            let element = typeof e === 'string' ? e : ('' + e);
            return element.startsWith(a1) ? a.concat(i) : a;
        }, []);

        // Check is cluster is pt geom
        if (a_index.length && feature.geometry.geometries[c_it].type === 'MultiPoint') {
            return a_index.map((idx) => {
                return {
                    number: cluster[c_it][idx],
                    numberAsInt: parseInt(cluster[c_it][idx]),
                    geometry: {
                        type:'Point',
                        coordinates: feature.geometry.geometries[c_it].coordinates[idx]
                    }
                };
            });
        }
    }

    return [];
}

function reverse(feat,query) {
    // Convert address clusters into points
    const lon = query[0];
    const lat = query[1];

    if (!feat.geometry || feat.geometry.type !== 'GeometryCollection') return false;

    const cluster = feat.properties['carmen:addressnumber'];
    let closest;

    for (let c_it = 0; c_it < cluster.length; c_it++) {
        if (!cluster[c_it]) continue;

        let l = cluster[c_it].length;
        while (l--) {
            const lon2 = feat.geometry.geometries[c_it].coordinates[l][0];
            const lat2 = feat.geometry.geometries[c_it].coordinates[l][1];
            const phi1 = lat * (Math.PI / 180);
            const phi2 = lat2 * (Math.PI / 180);
            const deltaPhi = (lat2 - lat) * (Math.PI / 180);
            const deltaLambda = (lon2 - lon) * (Math.PI / 180);
            const dist = 6371 * 2 * Math.atan2(Math.sqrt(Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2)), Math.sqrt(1 - Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2)));

            if (closest === undefined || closest.distance > dist) {
                closest = { cluster_it: c_it, cluster_pos: l, distance: dist, address: cluster[c_it][l] };
            }
        }
    }

    if (!closest) return false;

    // TODO This, like all address features in carmen is hardcoded for
    // US Style addresses. Once alternate address formats are added, this will
    // need to be changed ~ingalls
    feat = JSON.parse(JSON.stringify(feat));
    feat.geometry = {
        type: 'Point',
        coordinates: feat.geometry.geometries[closest.cluster_it].coordinates[closest.cluster_pos]
    };
    feat.properties['carmen:address'] = closest.address;
    return feat;
}
