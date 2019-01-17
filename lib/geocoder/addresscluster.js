'use strict';
module.exports.forward = forward;
module.exports.reverse = reverse;

/**
 * Find the matching address in a forward query on an address cluster
 *
 * @param {Object} feat GeoJSON Feature to derive individual address from
 * @param {String|number} address User's queried address number
 *
 * @return {Array|false} Array of potential address feats or false
 */
function forward(feat, address) {
    if (!feat.geometry || feat.geometry.type !== 'GeometryCollection') return false;

    // Check both forms of the address (raw, number-parsed)
    const a1 = typeof address === 'string' ? address.toLowerCase() : address;
    const a2 = typeof address === 'string' ? address.replace(/\D/, '') : address;

    const cluster = feat.properties['carmen:addressnumber'];

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
        if (a_index.length && feat.geometry.geometries[c_it].type === 'MultiPoint') {
            return a_index.map((idx) => {
                let feat_clone = JSON.parse(JSON.stringify(feat));

                for (const prop of Object.keys(feat.properties)) {
                    if (prop.split(':')[0] === 'carmen') continue;

                    if (
                        feat_clone.properties['carmen:addressprops']
                        && feat_clone.properties['carmen:addressprops'][prop]
                        && feat_clone.properties['carmen:addressprops'][prop][idx]
                    ) {
                        feat_clone.properties[prop] = feat_clone.properties['carmen:addressprops'][prop][idx];
                    }
                }

                feat_clone.geometry = {
                    type:'Point',
                    coordinates: [
                        Math.round(feat.geometry.geometries[c_it].coordinates[idx][0] * 1e6) / 1e6,
                        Math.round(feat.geometry.geometries[c_it].coordinates[idx][1] * 1e6) / 1e6
                    ]
                };

                return feat_clone;
            });
        }
    }

    return false;
}

/**
 * Find the matching address for a reverse query on an address cluster
 *
 * @param {Object} feat GeoJSON Feature to derive individual address from
 * @param {Array} query User's queried lng/lat point
 *
 * @return {Object|false} Return mutated feat object or false if no match is found
 */
function reverse(feat, query) {
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

    for (const prop of Object.keys(feat.properties)) {
        if (prop.split(':')[0] === 'carmen') continue;

        if (
            feat.properties['carmen:addressprops']
            && feat.properties['carmen:addressprops'][prop]
            && feat.properties['carmen:addressprops'][prop][closest.cluster_pos]
        ) {
            feat.properties[prop] = feat.properties['carmen:addressprops'][prop][closest.cluster_pos];
        }
    }

    feat.geometry = {
        type: 'Point',
        coordinates: feat.geometry.geometries[closest.cluster_it].coordinates[closest.cluster_pos]
    };

    feat.properties['carmen:address'] = closest.address;

    return feat;
}
