import db from '../ultis/db.js';

export default {
  async getCourseRating(proid) {
    const [result] = await db('reviews')
      .where('proid', proid)
      .select(
        db.raw('COALESCE(AVG(rating), 0) as avg_rating'),
        db.raw('COUNT(id) as review_count')
      );

    return {
      average: Number(parseFloat(result.avg_rating).toFixed(1)),
      count: parseInt(result.review_count),
    };
  },

  async getRatingDistribution(proid) {
    const distribution = await db('reviews')
      .where('proid', proid)
      .select('rating')
      .count('id as count')
      .groupBy('rating')
      .orderBy('rating', 'desc');

    const result = [5, 4, 3, 2, 1].map((rating) => {
      const found = distribution.find((d) => d.rating === rating);
      return {
        rating,
        count: found ? parseInt(found.count) : 0,
      };
    });

    return result;
  },

  async getByCourse(proid, page = 1, limit = 5) {
    const offset = (page - 1) * limit;

    const reviews = await db('reviews as r')
      .join('users as u', 'r.user_id', 'u.id')
      .where('r.proid', proid)
      .select(
        'r.id',
        'r.rating',
        'r.comment',
        'r.created_at',
        'r.updated_at',
        'u.name as user_name',
        'u.id as user_id',
        'u.avatar as avatar'
      )
      .orderBy('r.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db('reviews').where('proid', proid).count('id as count');

    return {
      data: reviews,
      pagination: {
        page,
        limit,
        total: parseInt(count),
        totalPages: Math.ceil(parseInt(count) / limit),
      },
    };
  },

  async getUserReview(userId, proid) {
    const review = await db('reviews').where({ user_id: userId, proid }).first();

    return review;
  },

  sanitizeComment(comment) {
    if (!comment) return '';

    // Trim whitespace and limit length to 1000 characters
    let sanitized = String(comment).trim();
    if (sanitized.length > 1000) {
      sanitized = sanitized.substring(0, 1000);
    }

    // Aggressively strip javascript: protocols and inline event handlers
    sanitized = sanitized.replace(/javascript\s*:/gi, '');
    sanitized = sanitized.replace(/\bon[a-z]+\s*=/gi, '');

    // Replace HTML characters with entity equivalents
    return sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  },

  async createOrUpdate(userId, proid, rating, comment) {
    const enrollment = await db('enrollment').where({ user_id: userId, proid }).first();

    if (!enrollment) {
      throw new Error('You must be enrolled in this course to leave a review');
    }

    const safeComment = this.sanitizeComment(comment);

    const existingReview = await db('reviews').where({ user_id: userId, proid }).first();

    if (existingReview) {
      const [review] = await db('reviews')
        .where({ user_id: userId, proid })
        .update({
          rating,
          comment: safeComment,
          updated_at: db.fn.now(),
        })
        .returning('*');

      return review;
    } else {
      const [review] = await db('reviews')
        .insert({
          user_id: userId,
          proid,
          rating,
          comment: safeComment,
        })
        .returning('*');

      return review;
    }
  },
};
