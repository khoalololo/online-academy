import db from '../ultis/db.js';

export default {
  /**
   * Mark a lesson as complete for a user
   */
  async markComplete(userId, lessonId) {
    const [progress] = await db('lesson_progress')
      .insert({
        user_id: userId,
        lesson_id: lessonId,
        is_completed: true,
        completed_at: db.fn.now(),
        updated_at: db.fn.now()
      })
      .onConflict(['user_id', 'lesson_id'])
      .merge({
        is_completed: true,
        completed_at: db.fn.now(),
        updated_at: db.fn.now()
      })
      .returning('*');

    return progress;
  },

  /**
   * Mark a lesson as incomplete
   */
  async markIncomplete(userId, lessonId) {
    const [progress] = await db('lesson_progress')
      .where({ user_id: userId, lesson_id: lessonId })
      .update({
        is_completed: false,
        completed_at: null,
        updated_at: db.fn.now()
      })
      .returning('*');

    return progress;
  },

  /**
   * Update video watch position
   */
  async updateWatchPosition(userId, lessonId, position) {
    const [progress] = await db('lesson_progress')
      .insert({
        user_id: userId,
        lesson_id: lessonId,
        last_watched_position: position,
        updated_at: db.fn.now()
      })
      .onConflict(['user_id', 'lesson_id'])
      .merge({
        last_watched_position: position,
        updated_at: db.fn.now()
      })
      .returning('*');

    return progress;
  },

  /**
   * Get user's progress for a specific lesson
   */
  async getProgress(userId, lessonId) {
    const progress = await db('lesson_progress')
      .where({ user_id: userId, lesson_id: lessonId })
      .first();

    return progress;
  },

  /**
   * Get all lesson progress for a course
   */
  async getCourseProgress(userId, proid) {
    const progress = await db('lesson_progress as lp')
      .join('lessons as l', 'lp.lesson_id', 'l.id')
      .where('l.proid', proid)
      .where('lp.user_id', userId)
      .select('lp.*', 'l.title as lesson_title')
      .orderBy('l.order_index', 'asc');

    return progress;
  },

  /**
   * Calculate course completion percentage
   */
  async getCourseCompletionPercentage(userId, proid) {
    // Get total lessons for the course
    const [{ count: totalLessons }] = await db('lessons')
      .where('proid', proid)
      .count('id as count');

    if (parseInt(totalLessons) === 0) return 0;

    // Get completed lessons for the user
    const [{ count: completedLessons }] = await db('lesson_progress as lp')
      .join('lessons as l', 'lp.lesson_id', 'l.id')
      .where('l.proid', proid)
      .where('lp.user_id', userId)
      .where('lp.is_completed', true)
      .count('lp.id as count');

    const percentage = Math.round((parseInt(completedLessons) / parseInt(totalLessons)) * 100);
    return percentage;
  },

  /**
   * Get lessons with completion status for a course
   */
  async getLessonsWithProgress(userId, proid) {
    const lessons = await db('lessons as l')
      .leftJoin('lesson_progress as lp', function() {
        this.on('l.id', '=', 'lp.lesson_id')
            .andOn('lp.user_id', '=', db.raw('?', [userId]));
      })
      .where('l.proid', proid)
      .select(
        'l.*',
        'lp.is_completed',
        'lp.last_watched_position',
        'lp.completed_at'
      )
      .orderBy('l.order_index', 'asc');

    return lessons;
  },

  /**
   * Check if user has completed all lessons in a course
   */
  async isCourseCompleted(userId, proid) {
    const percentage = await this.getCourseCompletionPercentage(userId, proid);
    return percentage === 100;
  }
};