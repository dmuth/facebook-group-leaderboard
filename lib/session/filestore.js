/**
* This module is used to create FileStore() objects.
*/


var session = require('express-session')
var session_file_store = require("session-file-store");


module.exports = function() {

	var FileStore = session_file_store(session);

	var options = {
		//
		// Live for 7 days
		//
		ttl: 3600 * 24 * 7,
		};

	var store = new FileStore(options);

	return(store);

} // End of exports()


