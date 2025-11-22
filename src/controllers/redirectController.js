const { prisma, withRetry } = require('../db/prisma');
const trackClick = require('../middleware/analytics').trackClick;

/**
 * Redirect to original URL
 */
const redirect = async (req, res, next) => {
  try {
    const { shortCode } = req.params;

    // Find link by short code - optimize for redirect speed
    const link = await withRetry(() =>
      prisma.link.findUnique({
        where: { shortCode },
        select: {
          id: true,
          originalUrl: true,
          isActive: true,
          expiresAt: true
        }
      })
    );

    // Check if link exists
    if (!link) {
      return res.status(404).send('Not Found');
    }

    // Check if link is active
    if (!link.isActive) {
      return res.status(404).send('Not Found');
    }

    // Check if link has expired
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return res.status(404).send('Not Found');
    }

    // Track analytics asynchronously (don't block redirect)
    trackClick(link.id, req).catch(console.error);

    // Redirect to original URL
    res.redirect(302, link.originalUrl);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  redirect
};

