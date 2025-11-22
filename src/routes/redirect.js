const redirectController = require('../controllers/redirectController');

/**
 * @route   GET /:shortCode
 * @desc    Redirect to original URL
 * @access  Public
 */
module.exports = redirectController.redirect;
