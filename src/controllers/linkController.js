const { prisma, withRetry } = require('../db/prisma');
const generateShortCode = require('../utils/generateShortCode');
const validateUrl = require('../utils/validateUrl');

/**
 * Create a new short link
 */
const createLink = async (req, res, next) => {
  try {
    const { originalUrl, title, description, expiresAt, shortCode: customShortCode } = req.body;

    // Validate URL
    if (!validateUrl(originalUrl)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid URL. Must be a valid http:// or https:// URL'
      });
    }

    // Generate or use custom short code
    let shortCode;
    if (customShortCode) {
      // Check if custom short code is available
      const existing = await withRetry(() => 
        prisma.link.findUnique({
          where: { shortCode: customShortCode }
        })
      );

      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Short code already exists. Please choose a different one.'
        });
      }
      shortCode = customShortCode;
    } else {
      // Generate unique short code
      let isUnique = false;
      let attempts = 0;
      const maxAttempts = 10;

      while (!isUnique && attempts < maxAttempts) {
        // Generate random length between 6-8 as per spec [A-Za-z0-9]{6,8}
        const randomLength = Math.floor(Math.random() * 3) + 6; // 6, 7, or 8
        shortCode = await generateShortCode(randomLength);
        const existing = await withRetry(() =>
          prisma.link.findUnique({
            where: { shortCode }
          })
        );
        if (!existing) {
          isUnique = true;
        }
        attempts++;
      }

      if (!isUnique) {
        return res.status(500).json({
          success: false,
          message: 'Failed to generate unique short code. Please try again.'
        });
      }
    }

    // Parse expiration date
    let expiresAtDate = null;
    if (expiresAt) {
      expiresAtDate = new Date(expiresAt);
      if (isNaN(expiresAtDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid expiration date'
        });
      }
    }

    // Create link (public, no user required)
    const link = await withRetry(() =>
      prisma.link.create({
        data: {
          shortCode,
          originalUrl,
          title: title || null,
          description: description || null,
          expiresAt: expiresAtDate
        }
      })
    );

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const shortUrl = `${baseUrl}/${shortCode}`;

    res.status(201).json({
      success: true,
      message: 'Short link created successfully',
      data: {
        link: {
          ...link,
          shortUrl
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all links (public)
 */
const getLinks = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};

    // Add search filter if provided
    if (search) {
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      
      // Extract shortCode from search term if it looks like a short URL
      let extractedShortCode = null;
      
      // Check if search term contains the baseUrl pattern
      if (search.includes(baseUrl)) {
        // Extract the shortCode part after the baseUrl
        const urlPattern = new RegExp(`${baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/([A-Za-z0-9]+)`, 'i');
        const match = search.match(urlPattern);
        if (match && match[1]) {
          extractedShortCode = match[1];
        }
      } else {
        // Also check for patterns like "localhost:3000/abc123" or just "/abc123"
        const urlPattern = /\/?([A-Za-z0-9]{6,8})(?:\/|$)/i;
        const match = search.match(urlPattern);
        if (match && match[1]) {
          extractedShortCode = match[1];
        }
      }
      
      // Build search conditions
      const searchConditions = [
        { originalUrl: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } }
      ];
      
      // If we extracted a shortCode from a URL pattern, search for that specific shortCode
      // Otherwise, search for the full search term in shortCode
      if (extractedShortCode) {
        searchConditions.push({ shortCode: { contains: extractedShortCode, mode: 'insensitive' } });
      } else {
        searchConditions.push({ shortCode: { contains: search, mode: 'insensitive' } });
      }
      
      where.OR = searchConditions;
    }

    const [links, total] = await Promise.all([
      withRetry(() =>
        prisma.link.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            shortCode: true,
            originalUrl: true,
            title: true,
            description: true,
            clicks: true,
            isActive: true,
            expiresAt: true,
            createdAt: true,
            updatedAt: true
          }
        })
      ),
      withRetry(() => prisma.link.count({ where }))
    ]);

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const linksWithShortUrl = links.map(link => ({
      ...link,
      shortUrl: `${baseUrl}/${link.shortCode}`
    }));

    res.json({
      success: true,
      data: {
        links: linksWithShortUrl,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get stats for a single link by code (public)
 */
const getLinkByCode = async (req, res, next) => {
  try {
    const { code } = req.params;

    const link = await withRetry(() =>
      prisma.link.findUnique({
        where: {
          shortCode: code
        },
        include: {
          analytics: {
            take: 10,
            orderBy: { clickedAt: 'desc' },
            select: {
              id: true,
              ipAddress: true,
              userAgent: true,
              referer: true,
              deviceType: true,
              browser: true,
              os: true,
              clickedAt: true
            }
          }
        }
      })
    );

    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'Link not found'
      });
    }

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const shortUrl = `${baseUrl}/${link.shortCode}`;

    res.json({
      success: true,
      data: {
        link: {
          ...link,
          shortUrl
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a link by code (public)
 */
const deleteLink = async (req, res, next) => {
  try {
    const { code } = req.params;

    // Check if link exists and delete in one operation for better performance
    const link = await withRetry(() =>
      prisma.link.findUnique({
        where: {
          shortCode: code
        }
      })
    );

    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'Link not found'
      });
    }

    await withRetry(() =>
      prisma.link.delete({
        where: { shortCode: code }
      })
    );

    res.json({
      success: true,
      message: 'Link deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createLink,
  getLinks,
  getLinkByCode,
  deleteLink
};

