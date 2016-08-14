/**
* Endpoint for /group
*/
var express = require('express');
var router = express.Router();


module.exports = function(fb) {


router.get('/:group', function(req, res, next) {

	var data = fb.getData();
	var group = req.params.group;

	if (!data[group]) {
		res.status(404)
			.send("Group not found!");
		return(null);
	}

	res.render('group', { group: group, data: data[group] });

});

return(router);

} // End of exports()

