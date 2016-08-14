/**
* Return our session object
*/


var session = require('express-session')
var file_store = require("./filestore");


/**
* @param string session
*/
module.exports = function(secret) {

return(function() {
	var store = new file_store();

	var retval = session({ 
		secret: secret,
		resave: false, 
		//
		// I *could* set this to true so I don't get errors like this:
		//
		// [session-file-store] will retry, error on last attempt: Error: ENOENT, open 'sessions/zc0k2wXi7QPOKW-RkJtYINA-yns2feSH.json'
		//
		// ...but then, every bot that hits the site would generate a session.
		//
		// So I'll take errors, versus my disk filling up...
		//
		saveUninitialized: false,
		store: store,
		});


	//
	// Borrowed this code from another (currently unreleased) project I worked on.
	// Might as well keep it here in case I choose to roll out websockets in the future.
	//
	// "extend" our object to return the secret for the websocket code.
	//
	// I chose this method for doing so as I perceive it as the path of least resistance.
	// Sadly, constructors and classes are pretty crazy in Javascript:
	//
	// https://zeekat.nl/articles/constructors-considered-mildly-confusing.html
	//
	// ...so I considered this the least complex method.
	//
	//retval.getSecret = function() {
	//	return(secret);
	//}

	return(retval);
});


} // End of exports()


