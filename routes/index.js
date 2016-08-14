/**
* Endpoint for /
*/
var express = require('express');
var router = express.Router();

var debug = require("debug")("app");

module.exports = function(fb) {


router.get('/', function(req, res, next) {

	var data = fb.getData();

	user = null;
	provider = null;

	if (req.user) {
		user = req.user.name;
		provider = req.user.provider;
		provider_id = req.user.provider_id;
		var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
		debug("user=\"" + user + "\" id=\"" + provider_id + "\" ip=\"" + ip + "\"");

	}

	res.render('index', { data: data });

});

return(router);

} // End of exports()

