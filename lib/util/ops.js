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
        // var contextMap = context.map(gettext);
        // var name = contextMap.shift();
        // format = format.replace('{num}', feat.properties['carmen:address']).replace('{name}', name).replace(/\{.+?\}/, '', 'g');
        // place_name = (format + (contextMap.length!==0 ? ', ' : '') + contextMap.join(', ')).trim();

        var contextMap = [];
        for (var i = 0; i < context.length; i++) {
          var f = context[i];
          if (!f.address['carmen:text'] && !f.properties['carmen:legacy']) throw new Error('Feature has no carmen:text');
          var prop = f._extid.split('.')[0]; // prop name, ex 'place', 'postcode', 'region'
          contextMap[prop] = (f.properties['carmen:text']||'').split(',')[0];
          if(prop == 'address' && f.properties['carmen:address']) {
            contextMap['number'] = f.properties['carmen:address'];
          }
        }

        if(feat.properties['carmen:address']) {
          var address = feat.properties['carmen:address'];
        }

        // Shotgun approach - replace all possible index categories with available mapped properties
        if(contextMap.place)    { format = format.replace('{place.name}', contextMap.place); }
        if(contextMap.number)   { format = format.replace('{address.number}', contextMap.number); }
        if(contextMap.address)  { format = format.replace('{address.name}', contextMap.address); }
        if(contextMap.region)   { format = format.replace('{region.name}', contextMap.region); }
        if(contextMap.postcode) { format = format.replace('{postcode.name}', contextMap.postcode); }
        if(contextMap.country)  { format = format.replace('{country.name}', contextMap.country); }
        if(contextMap.poi)      { format = format.replace('{poi.name}', contextMap.poi); }
        // Account for old-style of {name} {num} for place_name
        // TODO: Remove this once {address.number} {address.name} is standardized
        if(contextMap.number)   { format = format.replace('{num}', contextMap.number); }
        if(contextMap.address)  { format = format.replace('{name}', contextMap.address); }

        // ..then handle any cases where context wasn't available by getting rid of curly braces, awkwards spaces/commas
        format = format.replace(/\{.+?\}/g, '').replace(/ \, /g,', ').replace(/, ,/,'').replace(/  /,' ').trim();
        place_name = format;
    }

    var feature = {
        id: feat.properties['carmen:extid'],
        type: 'Feature',
        text: gettext(feat),
        place_name: place_name,
        relevance: context._relevance,
        properties: {}
    };

    if (feat.bbox) feature.bbox = feat.bbox;

    if (feat.properties['carmen:center']) {
        feature.center = feat.geometry && feat.geometry.type === 'Point' ?
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
    if (feat.properties['carmen:address']) feature.address = feat.properties['carmen:address'];
    for (var key in context[0].properties) if (key.indexOf('carmen:') !== 0) {
        feature.properties[key] = context[0].properties[key];
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
