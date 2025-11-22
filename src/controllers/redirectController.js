const { PrismaClient } = require('@prisma/client');
const trackClick = require('../middleware/analytics').trackClick;

const prisma = new PrismaClient();

/**
 * Redirect to original URL
 */
const redirect = async (req, res, next) => {
  try {
    const { shortCode } = req.params;

    // Find link by short code
    const link = await prisma.link.findUnique({
      where: { shortCode }
    });

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

