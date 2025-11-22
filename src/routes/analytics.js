const express = require('express');
const { param, query } = require('express-validator');
const handleValidationErrors = require('../middleware/validation');
const analyticsController = require('../controllers/analyticsController');

const router = express.Router();

/**
 * @route   GET /api/analytics/summary/:linkId
 * @desc    Get summary analytics for a link
 * @access  Public
 */
router.get(
  '/summary/:linkId',
  [param('linkId').notEmpty()],
  handleValidationErrors,
  analyticsController.getAnalyticsSummary
);

/**
 * @route   GET /api/analytics/:linkId
 * @desc    Get analytics for a specific link
 * @access  Public
 */
router.get(
  '/:linkId',
  [
    param('linkId').notEmpty(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  handleValidationErrors,
  analyticsController.getAnalytics
);

module.exports = router;
