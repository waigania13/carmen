var kinks = require('turf-kinks');

process.on('message', function(doc) {
 	process.send(runChecks(doc));
});

function runChecks(doc) {
    if (!doc._id) return 'doc has no _id';
    else if (!doc._text) return 'doc has no _text on _id:' + doc._id;
    else if (!doc._center && !doc._geometry) return 'doc has no _center or _geometry on _id:' + doc._id;
    else if(doc._geometry && (doc._geometry.type === 'Polygon' || doc._geometry.type === 'MultiPolygon')) {
 		var intersections = kinks(doc._geometry);
 		if(intersections.length > 0) {
			return 'doc '+doc._text+' contains self intersection polygons at the following vertices:\n'+JSON.stringify(intersections);
		} 
 	}
    return '';
}