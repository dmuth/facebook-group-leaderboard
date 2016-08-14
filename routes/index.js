/**
* Endpoint for /
*/
var express = require('express');
var router = express.Router();


module.exports = function(fb) {


router.get('/', function(req, res, next) {

	var data = fb.getData();

	res.render('index', { data: data });

});

return(router);

} // End of exports()

