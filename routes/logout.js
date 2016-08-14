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

	var user = null;
	var provider = null;
	if (req.user) {
		var user = req.user.name;
		var provider = req.user.provider;
		debug("Logging out %s, %s", user, provider);
	}

	delete req.user;

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


