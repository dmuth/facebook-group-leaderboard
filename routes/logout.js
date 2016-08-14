/**
* Endpont for /logout
*/

var express = require('express');
var router = express.Router();

var debug = require("debug")("app");

//
// GET /
//
router.get('/', function(req, res, next) {

	user = null;
	provider = null;
	if (req.user) {
		user = req.user.name;
		provider = req.user.provider;
		debug("Logging out %s, %s", user, provider);
		
	}

	//debug("COUNT: %s", req.session.count);
	req.logout();
	req.session.destroy(function(err) {
		if (err) {
			debug("Unable to destroy session!");
		}
	});


	//debug("COUNT AFTER: %s", req.session && req.session.count);
	res.redirect("/");

});

module.exports = router;


