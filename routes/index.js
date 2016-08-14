/**
* Endpoint for /
*/
var express = require('express');
var router = express.Router();

var debug = require("debug")("app");

module.exports = function(fb) {


router.get('/', function(req, res, next) {

	var data = fb.getData();

	var user = null;

	//
	// If we're logged in, pull out the user info
	//
	if (req.user) {
	
		var user = {
			name: req.user.name,
			provider: req.user.provider,
			provider_id: req.user.provider_id,
			};	
		var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
		debug("user=\"" + user.name + "\" id=\"" + user.provider_id + "\" ip=\"" + ip + "\"");

	}

	res.render('index', { data: data, user: user});

});

return(router);

} // End of exports()

