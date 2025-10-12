import db from '../ultis/db.js';

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
    return await db('watchlist as w')
      .join('courses as c', 'w.proid', 'c.proid')
      .join('categories as cat', 'c.catid', 'cat.id')
      .join('users as instructor', 'c.instructor_id', 'instructor.id')
      .where('w.user_id', userId)
      .select('c.*', 'cat.name as category_name', 'instructor.name as instructor_name')
      .orderBy('w.proid', 'desc');
  },

  async getCount(userId) {
    const [result] = await db('watchlist').where('user_id', userId).count('proid as count');
    return parseInt(result.count);
  }
};