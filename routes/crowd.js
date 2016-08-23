/**
* Endpoint for /:crowd and its children
*/
var express = require('express');
var router = express.Router();

var debug = require("debug")("page-crowd");

module.exports = function(fb) {


router.get("/:crowd", function(req, res, next) {

	var data = fb.getData();
	var last_run = fb.isRunning();
	var crowd = req.params.crowd;
	debug("Loading page for crowd '" + crowd + "'");

	if (!data[crowd]) {
		res.status(404);
		res.render("404-temp", { url: req.url, message: "Crowd not found!" });
		return(null);
	}

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

	res.render("crowd", { crowd: crowd, data: data[crowd], user:user, last_run: last_run });

});


router.get("/:crowd/:group", function(req, res, next) {

	var data = fb.getData();
	var last_run = fb.isRunning();
	var crowd = req.params.crowd;
	var group = req.params.group;
	debug("Loading page for crowd '" + crowd + "', group '" + group + "'");

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

	if (!data[crowd]) {
		res.status(404);
		res.render("404-temp", { url: req.url, message: "Crowd not found!", user: user, last_run: last_run });
		return(null);
	}

	if (!data[crowd][group]) {
		res.status(404);
		res.render("404-temp", { url: req.url, message: "Group not found!", user: user, last_run: last_run });
		return(null);
	}

	res.render("group", { crowd: crowd, group: group, crowd_name: data[crowd].name, 
		data: data[crowd][group], user:user, last_run: last_run });

});

return(router);

} // End of exports()

