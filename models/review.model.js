import db from '../ultis/db.js';

export default {

//* Get average rating and count for a course
  async getCourseRating(proid) {
    const [result] = await db('reviews')
      .where('proid', proid)
      .select(
        db.raw('COALESCE(AVG(rating), 0) as avg_rating'),
        db.raw('COUNT(id) as review_count')
      );

    return {
      average: Number(parseFloat(result.avg_rating).toFixed(1)),
      count: parseInt(result.review_count)
    };
  },

  /**
   * Get rating distribution (1-5 stars breakdown)
   */
  async getRatingDistribution(proid) {
    const distribution = await db('reviews')
      .where('proid', proid)
      .select('rating')
      .count('id as count')
      .groupBy('rating')
      .orderBy('rating', 'desc');

    // Create array with all ratings (5 to 1)
    const result = [5, 4, 3, 2, 1].map(rating => {
      const found = distribution.find(d => d.rating === rating);
      return {
        rating,
        count: found ? parseInt(found.count) : 0
      };
    });

    return result;
  },

  // ==================== GET REVIEWS ====================

  /**
   * Get all reviews for a course with pagination
   */
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

    const [{ count }] = await db('reviews')
      .where('proid', proid)
      .count('id as count');

    return {
      data: reviews,
      pagination: {
        page,
        limit,
        total: parseInt(count),
        totalPages: Math.ceil(parseInt(count) / limit)
      }
    };
  },

  /**
   * Check if user has reviewed a course
   */
  async getUserReview(userId, proid) {
    const review = await db('reviews')
      .where({ user_id: userId, proid })
      .first();

    return review;
  },

  // ==================== CREATE/UPDATE REVIEW ====================

  /**
   * Create or update a review
   */
  async createOrUpdate(userId, proid, rating, comment) {
    // Check if user is enrolled
    const enrollment = await db('enrollment')
      .where({ user_id: userId, proid })
      .first();

    if (!enrollment) {
      throw new Error('You must be enrolled in this course to leave a review');
    }

    // Check if review exists
    const existingReview = await db('reviews')
      .where({ user_id: userId, proid })
      .first();

    if (existingReview) {
      // Update existing review
      const [review] = await db('reviews')
        .where({ user_id: userId, proid })
        .update({
          rating,
          comment,
          updated_at: db.fn.now()
        })
        .returning('*');

      return review;
    } else {
      // Create new review
      const [review] = await db('reviews')
        .insert({
          user_id: userId,
          proid,
          rating,
          comment
        })
        .returning('*');

      return review;
    }
  }
};