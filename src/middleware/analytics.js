const { prisma, withRetry } = require('../db/prisma');

/**
 * Middleware to track link analytics
 */
const trackAnalytics = async (req, res, next) => {
  // Store original end function
  const originalEnd = res.end;

  // Override res.end to track analytics after response is sent
  res.end = function (chunk, encoding) {
    // Call original end
    originalEnd.call(this, chunk, encoding);

    // Track analytics asynchronously (don't block response)
    if (req.link) {
      trackClick(req.link.id, req).catch(console.error);
    }
  };

  next();
};

/**
 * Track a click on a link
 */
async function trackClick(linkId, req) {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent') || '';
    const referer = req.get('referer') || req.get('referrer') || null;

    // Parse user agent (simplified - in production, use a library like ua-parser-js)
    const deviceInfo = parseUserAgent(userAgent);

    // Use transaction for atomicity and better performance
    await withRetry(() =>
      prisma.$transaction([
        prisma.analytics.create({
          data: {
            linkId,
            ipAddress,
            userAgent,
            referer,
            ...deviceInfo
          }
        }),
        prisma.link.update({
          where: { id: linkId },
          data: { clicks: { increment: 1 } }
        })
      ])
    );
  } catch (error) {
    console.error('Error tracking analytics:', error);
  }
}

/**
 * Parse user agent string to extract device information
 * Simplified version - in production, use ua-parser-js library
 */
function parseUserAgent(userAgent) {
  const ua = userAgent.toLowerCase();
  
  let deviceType = 'desktop';
  let browser = 'unknown';
  let os = 'unknown';

  // Detect device type
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    deviceType = 'mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    deviceType = 'tablet';
  }

  // Detect browser
  if (ua.includes('chrome') && !ua.includes('edg')) {
    browser = 'chrome';
  } else if (ua.includes('firefox')) {
    browser = 'firefox';
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    browser = 'safari';
  } else if (ua.includes('edg')) {
    browser = 'edge';
  } else if (ua.includes('opera')) {
    browser = 'opera';
  }

  // Detect OS
  if (ua.includes('windows')) {
    os = 'windows';
  } else if (ua.includes('mac os') || ua.includes('macos')) {
    os = 'macos';
  } else if (ua.includes('linux')) {
    os = 'linux';
  } else if (ua.includes('android')) {
    os = 'android';
  } else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) {
    os = 'ios';
  }

  return { deviceType, browser, os };
}

module.exports = {
  trackAnalytics,
  trackClick
};

