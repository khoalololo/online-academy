import db from '../ultis/db.js';

export default {
  
  /**
   * Get all lessons for a course
   */
  async getByCourse(proid) {
    const lessons = await db('lessons')
      .where('proid', proid)
      .select('*')
      .orderBy('order_index', 'asc');

    return lessons;
  },

  /**
   * Get preview lessons (accessible without enrollment)
   */
  async getPreviewLessons(proid) {
    const lessons = await db('lessons')
      .where({ proid, is_preview: true })
      .select('*')
      .orderBy('order_index', 'asc');

    return lessons;
  },

  /**
   * Get total duration of all lessons in a course
   */
  async getTotalDuration(proid) {
    const [result] = await db('lessons')
      .where('proid', proid)
      .sum('duration as total_seconds');

    return parseInt(result.total_seconds) || 0;
  },

  /**
   * Get lesson count for a course
   */
  async getLessonCount(proid) {
    const [result] = await db('lessons')
      .where('proid', proid)
      .count('id as count');

    return parseInt(result.count);
  }
};