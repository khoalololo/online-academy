import db from '../ultis/db.js';
import { getBaseQuery as _getBaseQuery } from './course.model.js';

export default {
  async add(userId, proid) {
    const exists = await this.isInWatchlist(userId, proid);
    if (exists) throw new Error('Course already in watchlist');

    await db('watchlist').insert({ user_id: userId, proid });
    return true;
  },

  async remove(userId, proid) {
    await db('watchlist').where({ user_id: userId, proid }).del();
    return true;
  },

  async isInWatchlist(userId, proid) {
    const item = await db('watchlist').where({ user_id: userId, proid }).first();
    return !!item;
  },

  async getByUser(userId) {
    const courses = await _getBaseQuery()
      .join('watchlist as w', 'c.proid', 'w.proid')
      .where('w.user_id', userId)
      .select(
        'c.proid',
        'c.proname',
        'c.tinydes',
        'c.price',
        'c.promo_price',
        'cat.name as category_name',
        'u.name as instructor_name',
        'ratings.average_rating',
        'ratings.rating_count'
      )
      .orderBy('c.last_updated', 'desc');
      courses.forEach(course => {
        if (course.average_rating) course.average_rating = parseFloat(course.average_rating);
      });

      return courses;
  },

  async getCount(userId) {
    const [result] = await db('watchlist').where('user_id', userId).count('proid as count');
    return parseInt(result.count);
  }
};