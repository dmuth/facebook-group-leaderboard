
var debug = require("debug")("middleware-force-login");

module.exports = function(req, res, next) {

	if (req.user) {
		//
		// Heaven help you if you leave off the "var".  This becomes a GLOBAL VARIABLE
		// if you do that, showing users as logged in, even in Incognito Mode.
		//	
		// Took me an hour of debugging to figure THAT one out.
		//
		var user = {
			name: req.user.name,
			provider: req.user.provider,
			provider_id: req.user.provider_id,
			};	
		var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
		debug("user=\"" + user.name + "\" id=\"" + user.provider_id + "\" ip=\"" + ip + "\"");

		//
		// If we have a URL to redirect to, we probably just logged in.  So let's do that.
		// (and remove the URL from the session so we don't have a redirect loop...)
		//
		if (req.session.preLoginUrl) {
			var uri = req.session.preLoginUrl;
			delete req.session.preLoginUrl;
			debug("We have a URL to redirect to, let's do that! (%s)", uri);
			res.redirect(uri);
			return(null);
		}

	} else {
		//
		// We need to force the user to log in
		//
		if (
			req.url != "/please-login"
			&& req.url != "/logout"
			&& !req.url.match(/^\/auth/)
			) {
			debug("We need to stop and log this user in. URL: " + req.url);
			req.session.preLoginUrl = req.url;
			res.redirect("/please-login");
			return(null);
		}

	}

	next();

} // End of module.exports()


