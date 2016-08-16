/**
* Endpoint for /:crowd and its children
*/
var express = require('express');
var router = express.Router();

var debug = require("debug")("page-crowd");

module.exports = function(fb) {


router.get("/:crowd", function(req, res, next) {

	var data = fb.getData();
	var crowd = req.params.crowd;
	debug("Loading page for crowd '" + crowd + "'");

	if (!data[crowd]) {
		res.status(404)
			.send("Crowd not found!");
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

	res.render("crowd", { crowd: crowd, data: data[crowd], user:user });

});


router.get("/:crowd/:group", function(req, res, next) {

	var data = fb.getData();
	var crowd = req.params.crowd;
	var group = req.params.group;
	debug("Loading page for crowd '" + crowd + "', group '" + group + "'");

	if (!data[crowd]) {
		res.status(404)
			.send("Crowd not found!");
		return(null);
	}

	if (!data[crowd][group]) {
		res.status(404)
			.send("Group not found!");
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

	res.render("group", { crowd: crowd, group: group, crowd_name: data[crowd].name, data: data[crowd][group], user:user });

});

return(router);

} // End of exports()

