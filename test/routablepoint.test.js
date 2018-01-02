var tape = require('tape');
var routablePoint = require('../lib/pure/routablepoint.js');

tape('call routablepoint with valid inputs', function(assert) {
  var point = [1, 1]; // define a test point here
  var feature = {}; // define a test feature here
  var result = routablePoint(point, feature);
  // assert some things that you expect about the result here
  // then end the test
  assert.equals(1, 1, 'dummy test');
  assert.end();
});