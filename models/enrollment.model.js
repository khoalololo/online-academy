import db from '../ultis/db.js';

export default {
  async enroll(userId, proid) {
    const exists = await this.isEnrolled(userId, proid);
    if (exists) throw new Error('Already enrolled in this course');

    const [enrollment] = await db('enrollment')
      .insert({ user_id: userId, proid, is_completed: false })
      .returning('*');

    return enrollment;
  },

  async isEnrolled(userId, proid) {
    const enrollment = await db('enrollment').where({ user_id: userId, proid }).first();
    return !!enrollment;
  },

  async getByUser(userId) {
    return await db('enrollment as e')
      .join('courses as c', 'e.proid', 'c.proid')
      .join('categories as cat', 'c.catid', 'cat.id')
      .join('users as instructor', 'c.instructor_id', 'instructor.id')
      .where('e.user_id', userId)
      .select('e.*', 'c.proname', 'c.tinydes', 'c.price', 'cat.name as category_name', 'instructor.name as instructor_name')
      .orderBy('e.enroll_date', 'desc');
  }
};