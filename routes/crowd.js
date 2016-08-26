/**
* Endpoint for /:crowd and its children
*/
var express = require('express');
var router = express.Router();

var debug = require("debug")("page-crowd");

module.exports = function(fb) {


//
// Endpoint for a crowd, which is basically a list of groups
//
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


//
// Endpoint for a specific group's leaderboard
//
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


//
// Endpoint for a specific user, which shows their user info, posts, comments, etc.
//
router.get("/:crowd/:group/:user_id", function(req, res, next) {

	var data = fb.getData();
	var last_run = fb.isRunning();
	var crowd = req.params.crowd;
	var group = req.params.group;
	var user_id = req.params.user_id;
	debug("Loading page for crowd '" + crowd + "', group '" + group + "', user_id '" + user_id + "'");

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

	if (
		!data[crowd][group].post_stats_users[user_id]
		&&
		!data[crowd][group].comment_stats_users[user_id]
		) {
		res.status(404);
		res.render("404-temp", { url: req.url, message: "User not found!", user: user, last_run: last_run });
		return(null);
	}

	var group_data = data[crowd][group];
	var post_stats_index = group_data.post_stats_users[user_id];
	var comment_stats_index = group_data.comment_stats_users[user_id];
	var post_stats = group_data.post_stats[post_stats_index];
	var comment_stats = group_data.comment_stats[comment_stats_index];
	var last_updated = group_data.last_updated;

	var poster = {};
	if (post_stats && post_stats.user) {
		poster = post_stats.user;
	} else {
		poster = comment_stats.user;
	}

	res.render("user", {
		crowd: crowd,
		crowd_name: group_data.crowd_name, 
		group: group,
		group_name: group_data.name,
		poster: poster,
		post_stats: post_stats,
		comment_stats: comment_stats,
		user: user,
		last_run: last_run,
		last_updated: last_updated,
		});

});


return(router);

} // End of exports()

