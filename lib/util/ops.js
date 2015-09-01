// Reformat a context array into a GeoJSON feature.
module.exports.toFeature = function(context, format) {
    var feat = context[0];
    if (!feat.properties['carmen:center']&& !feat.properties['carmen:legacy']) throw new Error('Feature has no carmen:center');
    if (!feat.properties['carmen:extid'])  throw new Error('Feature has no carmen:extid');

    var gettext = function(f) {
        if (!f.properties['carmen:text'] && !f.properties['carmen:legacy']) throw new Error('Feature has no carmen:text');
        return (f.properties['carmen:text']||'').split(',')[0];
    };

    //Use geocoder_address to format output if applicable
    if (!format || format === true || !feat.properties['carmen:address']) {
        place_name = ((feat.properties['carmen:address'] ? feat.properties['carmen:address'] + ' ' : '') + context.map(gettext).join(', ')).trim();
    } else {
        var contextMap = context.map(gettext);
        var name = contextMap.shift();
        format = format.replace('{num}', feat.properties['carmen:address']).replace('{name}', name).replace(/\{.+?\}/, '', 'g');
        place_name = (format + (contextMap.length!==0 ? ', ' : '') + contextMap.join(', ')).trim();
    }

    var feature = {
        id: feat.properties['carmen:extid'],
        type: 'Feature',
        properties: {
            text: gettext(feat),
            place_name: place_name,
            relevance: context._relevance
        }
    };
    if (feat.properties['carmen:center']) {
        feature.properties.center = feat.geometry && feat.geometry.type === 'Point' ?
            feat.geometry.coordinates :
            feat.properties['carmen:center'];
        feature.geometry = feat.geometry || {
            type: 'Point',
            coordinates: feat.properties['carmen:center']
        };
    // This case is meant *only* for legacy carmen sources which supported
    // features without geometries.
    } else {
        feature.geometry = null;
    }
    if (feat.properties['carmen:bbox']) feature.bbox = feat.properties['carmen:bbox'];
    if (feat.properties['carmen:address']) feature.properties.address = feat.properties['carmen:address'];
    for (var key in context[0].properties) if (key.indexOf('carmen:') !== 0) {
            feature.properties[key] = context[0][key];
    }
    if (context.length > 1) {
        feature.context = [];
        for (var i = 1; i < context.length; i++) {
            if (!context[i].properties['carmen:extid']) throw new Error('Feature has no carmen:extid');
            feature.context.push({
                id: context[i].properties['carmen:extid'],
                text: gettext(context[i])
            });
        }
    }
    return feature;
};
