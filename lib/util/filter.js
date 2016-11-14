module.exports = {};
module.exports.sourceAllowed = sourceAllowed;
module.exports.sourceMatchesTypes = sourceMatchesTypes;
module.exports.sourceMatchesStacks = sourceMatchesStacks;
module.exports.featureAllowed = featureAllowed;
module.exports.featureMatchesTypes = featureMatchesTypes;
module.exports.featureMatchesStacks = featureMatchesStacks;

function sourceAllowed(source, options) {
    var allowed = true;
    if (options.stacks) allowed = allowed && sourceMatchesStacks(source, options);
    if (options.types) allowed = allowed && sourceMatchesTypes(source, options);
    return allowed;
}

function sourceMatchesStacks(source, options) {
    // No stack restriction on source
    if (!source.stack) return true;
    // Matches a stack
    for (var j = 0; j < source.stack.length; j++) {
        var stack = source.stack[j];
        if (options.stacks.indexOf(stack) !== -1) return true;
    }
    // No matches
    return false;
}

function sourceMatchesTypes(source, options) {
    // Matches a type
    if (options.types.indexOf(source.type) !== -1) return true;
    // Matches a subtype
    var subtypes = source.scoreranges ? Object.keys(source.scoreranges) : [];
    for (var st = 0; st < subtypes.length; st++) {
        var subtype = source.type + "." + subtypes[st];
        if (options.types.indexOf(subtype) !== -1) return true;
    }
    // No matches
    return false;
}

function featureAllowed(source, feature, options) {
    var allowed = true;
    if (options.stacks) allowed = allowed && featureMatchesStacks(feature, options);
    if (options.types) allowed = allowed && featureMatchesTypes(source, feature, options);
    return allowed;
}

function featureMatchesStacks(feature, options) {
    // No stack restriction on feature
    if (!feature.properties['carmen:geocoder_stack']) return true;
    // Check stacks for feature stack
    return options.stacks.indexOf(feature.properties['carmen:geocoder_stack']) !== -1;
}

// For a feature to match a type filter it must:
// - Pass the type check
// - Pass the subtype check by score (if it exists)
function featureMatchesTypes(source, feature, options) {
    for (var i = 0; i < options.types.length; i++) {
        var type = options.types[i].split('.');

        // Type-only check
        if (type[0] && !type[1]) {
            if (feature.properties['carmen:types'].indexOf(type[0]) !== -1) {
                return true;
            } else {
                continue;
            }
        }

        // Subtype check
        if (feature.properties['carmen:types'].indexOf(type[0]) !== -1 &&
            feature.properties['carmen:score'] &&
            source.scoreranges &&
            source.scoreranges[type[1]] !== undefined) {
            var range = source.scoreranges[type[1]].slice(0);
            range[0] = source.maxscore * range[0];
            range[1] = source.maxscore * range[1];
            if (feature.properties['carmen:score'] >= range[0] &&
                feature.properties['carmen:score'] <= range[1]) {
                return true;
            }
        }
    }
    return false;
}

