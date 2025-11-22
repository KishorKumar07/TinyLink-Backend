const express = require('express');
const { body, param, query } = require('express-validator');
const handleValidationErrors = require('../middleware/validation');
const linkController = require('../controllers/linkController');

const router = express.Router();

/**
 * @route   POST /api/links
 * @desc    Create a new short link
 * @access  Public
 */
router.post(
  '/',
  [
    body('originalUrl').notEmpty().withMessage('Original URL is required'),
    body('shortCode').optional().trim().matches(/^[A-Za-z0-9]{6,8}$/).withMessage('Short code must be 6-8 alphanumeric characters'),
    body('title').optional().trim(),
    body('description').optional().trim(),
    body('expiresAt').optional().isISO8601().withMessage('Invalid date format')
  ],
  handleValidationErrors,
  linkController.createLink
);

/**
 * @route   GET /api/links
 * @desc    List all links
 * @access  Public
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('search').optional().trim()
  ],
  handleValidationErrors,
  linkController.getLinks
);

/**
 * @route   GET /api/links/:code
 * @desc    Get stats for a single link by code
 * @access  Public
 */
router.get(
  '/:code',
  [param('code').notEmpty()],
  handleValidationErrors,
  linkController.getLinkByCode
);

/**
 * @route   DELETE /api/links/:code
 * @desc    Delete a link
 * @access  Public
 */
router.delete(
  '/:code',
  [param('code').notEmpty()],
  handleValidationErrors,
  linkController.deleteLink
);

module.exports = router;
