var kinks = require('turf-kinks');

process.on('message', function(data) {
 	process.send(runChecks(data.doc, data.zoom));
});

function runChecks(doc, zoom) {
	var message = '';
    if (!doc._id) {
    	message = 'doc has no _id';
    }
    else if (!doc._text) {
    	message = 'doc has no _text on _id:' + doc._id;
    }
    else if (!doc._center && !doc._geometry) {
    	message = 'doc has no _center or _geometry on _id:' + doc._id;
    }
    else if(!doc._zxy || doc._zxy.length === 0) {
        if(typeof zoom != 'number') {
        	message = 'index has no zoom on _id:'+doc.id;
        }
        if(zoom < 0) {
        	message = 'zoom must be greater than 0 --- zoom was '+zoom+' on _id:'+doc.id;
        }
        if(zoom > 14) {
        	message = 'zoom must be less than 15 --- zoom was '+zoom+' on _id:'+doc.id;
    	}
    }
    else if(doc._geometry && (doc._geometry.type === 'Polygon' || doc._geometry.type === 'MultiPolygon')) {
    	// check for Polygons or Multipolygons with too many vertices
    	if(doc._geometry.type === 'Polygon'){
    		var ringCount = doc._geometry.coordinates.length;
    		for (var i = 0; i < ringCount; i++) {
    			if(doc._geometry.coordinates[i].length > 50000){
    				message = 'Polygons may not have more than 50k vertices per ring. Simplify your polygons, or split the polygon into multiple parts.';
    			}
    		}
    	} else {
    		var polygonCount = doc._geometry.coordinates.length;
    		for(var k = 0; k < polygonCount; k++) {
	    		var ringCount = doc._geometry.coordinates[k].length;
	    		for (var i = 0; i < ringCount; i++) {
	    			if(doc._geometry.coordinates[k][i].length > 50000){
	    				message = 'Polygons may not have more than 50k vertices per ring. Simplify your polygons, or split the polygon into multiple parts.';
	    			}
	    		}
	    	}
    	}
 		var intersections = kinks(doc._geometry);
 		if(intersections.length > 0) {
			message = 'doc '+doc._text+' contains self intersection polygons at the following vertices:\n'+JSON.stringify(intersections);
		}
 	}
 	
    return message;
}