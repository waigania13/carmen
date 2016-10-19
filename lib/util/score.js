module.exports.setMax = setMax;
module.exports.scaleMax = scaleMax;

/**
 * setMax - Return an allowed max score that is 7x the max of the median index
 * @param {object} geocoder a Carmen geocoder instance
 * @return {object} a number 7x the max score of the median index and a number equal to the max score of any index
 */
function setMax(geocoder) {
    var maxes = [];
    var max;
    var middle;
    geocoder.byidx.forEach(function(source) {
    	// get max score of each index
        max = (source._geocoder.get('freq', 1)||[0])[0] || 1;
        maxes.push(max)
    });
    // sort max scores from low to high
    maxes = maxes.sort(function(a, b) {
        return a - b;
    });
    // get the median max score, rounding up if there's an even number of indexes
    middle = maxes[Math.floor(maxes.length / 2)];
    max = maxes[maxes.length - 1];
    return {allowedMax: middle * 7, max: max};
}

/**
* scaleMax - Tax the rich. Proportionally scale all values over the allowed max such that `max * 6/7 < score < max`
* @param {number} scorefactor the raw max score of an individual index
* @param {object} maxScore an object containing the highest max score of all indexes, and the allowed maximum from `setMax()`
* @retrun {number} the new max score scaled to the allowed max
*/
function scaleMax(scorefactor, maxScore) {
    var allowedToMax = maxScore.max - maxScore.allowedMax;
    var allowedToScorefactor = scorefactor - maxScore.allowedMax;
    var ratio = allowedToScorefactor / allowedToMax;
    return Math.floor((maxScore.allowedMax * 6/7) + ((maxScore.allowedMax / 7) * ratio));
}