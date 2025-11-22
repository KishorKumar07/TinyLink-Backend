const { prisma, withRetry } = require('../db/prisma');

/**
 * Get analytics for a specific link
 */
const getAnalytics = async (req, res, next) => {
  try {
    const { linkId } = req.params;
    const { startDate, endDate, page = 1, limit = 50 } = req.query;

    // Find link by ID
    const link = await withRetry(() =>
      prisma.link.findUnique({
        where: {
          id: linkId
        }
      })
    );

    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'Link not found'
      });
    }

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.clickedAt = {};
      if (startDate) dateFilter.clickedAt.gte = new Date(startDate);
      if (endDate) dateFilter.clickedAt.lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Get analytics data - optimize with parallel queries
    const [analytics, total, stats] = await Promise.all([
      withRetry(() =>
        prisma.analytics.findMany({
          where: {
            linkId,
            ...dateFilter
          },
          skip,
          take,
          orderBy: { clickedAt: 'desc' }
        })
      ),
      withRetry(() =>
        prisma.analytics.count({
          where: {
            linkId,
            ...dateFilter
          }
        })
      ),
      withRetry(() =>
        prisma.analytics.groupBy({
          by: ['deviceType', 'browser', 'os'],
          where: {
            linkId,
            ...dateFilter
          },
          _count: true
        })
      )
    ]);

    // Calculate device type distribution
    const deviceStats = stats.reduce((acc, stat) => {
      const key = stat.deviceType || 'unknown';
      acc[key] = (acc[key] || 0) + stat._count;
      return acc;
    }, {});

    // Calculate browser distribution
    const browserStats = stats.reduce((acc, stat) => {
      const key = stat.browser || 'unknown';
      acc[key] = (acc[key] || 0) + stat._count;
      return acc;
    }, {});

    // Calculate OS distribution
    const osStats = stats.reduce((acc, stat) => {
      const key = stat.os || 'unknown';
      acc[key] = (acc[key] || 0) + stat._count;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        link: {
          id: link.id,
          shortCode: link.shortCode,
          originalUrl: link.originalUrl,
          totalClicks: link.clicks
        },
        analytics,
        statistics: {
          totalClicks: total,
          deviceTypes: deviceStats,
          browsers: browserStats,
          operatingSystems: osStats
        },
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
 * Get summary analytics for a link
 */
const getAnalyticsSummary = async (req, res, next) => {
  try {
    const { linkId } = req.params;

    // Find link by ID
    const link = await withRetry(() =>
      prisma.link.findUnique({
        where: {
          id: linkId
        }
      })
    );

    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'Link not found'
      });
    }

    // Get click counts by date (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const clicksByDate = await withRetry(() =>
      prisma.analytics.groupBy({
        by: ['clickedAt'],
        where: {
          linkId,
          clickedAt: {
            gte: thirtyDaysAgo
          }
        },
        _count: true
      })
    );

    // Format for chart (group by day)
    const dailyClicks = {};
    clicksByDate.forEach(item => {
      const date = new Date(item.clickedAt).toISOString().split('T')[0];
      dailyClicks[date] = (dailyClicks[date] || 0) + item._count;
    });

    res.json({
      success: true,
      data: {
        link: {
          id: link.id,
          shortCode: link.shortCode,
          originalUrl: link.originalUrl,
          totalClicks: link.clicks,
          createdAt: link.createdAt
        },
        dailyClicks,
        last30Days: Object.keys(dailyClicks).length
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAnalytics,
  getAnalyticsSummary
};

