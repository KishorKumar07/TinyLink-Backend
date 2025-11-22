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

    // Get frontend URL for error page redirects
    // Use FRONTEND_URL if set, otherwise default to localhost:3001
    // BASE_URL is for generating short links (backend URL), not frontend
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    
    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Redirect] Frontend URL: ${frontendUrl}`);
    }

    // Check if link exists
    if (!link) {
      // Redirect to frontend error page
      const errorUrl = `${frontendUrl}/error?reason=not-found&code=${encodeURIComponent(shortCode)}`;
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Redirect] Link not found, redirecting to: ${errorUrl}`);
      }
      return res.redirect(302, errorUrl);
    }

    // Check if link is active
    if (!link.isActive) {
      // Redirect to frontend error page
      const errorUrl = `${frontendUrl}/error?reason=deactivated&code=${encodeURIComponent(shortCode)}`;
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Redirect] Link deactivated, redirecting to: ${errorUrl}`);
      }
      return res.redirect(302, errorUrl);
    }

    // Check if link has expired
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      // Redirect to frontend error page
      const errorUrl = `${frontendUrl}/error?reason=expired&code=${encodeURIComponent(shortCode)}`;
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Redirect] Link expired, redirecting to: ${errorUrl}`);
      }
      return res.redirect(302, errorUrl);
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

