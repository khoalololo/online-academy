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
  },

  /**
 * Create a new lesson
 */
  async create(lessonData) {
    const {
      proid,
      title,
      description,
      video_url,
      duration,
      order_index,
      is_preview
    } = lessonData;

    const [lesson] = await db('lessons')
      .insert({
        proid,
        title,
        description,
        video_url,
        duration: parseInt(duration),
        order_index: parseInt(order_index),
        is_preview: is_preview || false
      })
      .returning('*');

    return lesson;
  },

  /**
   * Update a lesson
   */
  async update(lessonId, lessonData) {
    const updateData = {};
    
    if (lessonData.title) updateData.title = lessonData.title;
    if (lessonData.description !== undefined) updateData.description = lessonData.description;
    if (lessonData.video_url) updateData.video_url = lessonData.video_url;
    if (lessonData.duration) updateData.duration = parseInt(lessonData.duration);
    if (lessonData.order_index !== undefined) updateData.order_index = parseInt(lessonData.order_index);
    if (lessonData.is_preview !== undefined) updateData.is_preview = lessonData.is_preview;

    const [updated] = await db('lessons')
      .where('id', lessonId)
      .update(updateData)
      .returning('*');

    return updated;
  },

  /**
   * Delete a lesson
   */
  async delete(lessonId) {
    await db('lessons').where('id', lessonId).del();
    return true;
  },

  /**
   * Get lesson by ID
   */
  async findById(lessonId) {
    return await db('lessons').where('id', lessonId).first();
  },

  /**
   * Reorder lessons for a course
   */
  async reorder(proid, lessonOrders) {
    // lessonOrders should be an array like: [{id: 1, order_index: 0}, {id: 2, order_index: 1}]
    const trx = await db.transaction();
    
    try {
      for (const item of lessonOrders) {
        await trx('lessons')
          .where({ id: item.id, proid })
          .update({ order_index: item.order_index });
      }
      
      await trx.commit();
      return true;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }
};