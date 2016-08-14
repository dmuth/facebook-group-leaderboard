/**
* Endpoint for /group
*/
var express = require('express');
var router = express.Router();

var debug = require("debug")("page-group");

module.exports = function(fb) {


router.get('/:group', function(req, res, next) {

	var data = fb.getData();
	var group = req.params.group;

	if (!data[group]) {
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

	res.render('group', { group: group, data: data[group], user:user });

});

return(router);

} // End of exports()

