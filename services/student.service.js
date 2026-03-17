import enrollmentModel from '../repositories/enrollment.repository.js';
import watchlistModel from '../repositories/watchlist.repository.js';
import courseModel from '../repositories/course.repository.js';
import lessonModel from '../repositories/lesson.repository.js';
import reviewModel from '../repositories/review.repository.js';
import lessonProgressModel from '../repositories/lesson-progress.repository.js';
import db from '../ultis/db.js';

export const StudentService = {
  async enrollInCourse(userId, proid) {
    return await enrollmentModel.enroll(userId, proid);
  },

  async getEnrolledCourses(userId) {
    const enrolledCourses = await enrollmentModel.getByUser(userId);
    for (const course of enrolledCourses) {
      course.progress = await lessonProgressModel.getCourseCompletionPercentage(
        userId,
        course.proid
      );
    }
    return enrolledCourses;
  },

  async getLearningData(userId, proid) {
    const isEnrolled = await enrollmentModel.isEnrolled(userId, proid);
    if (!isEnrolled) {
      throw new Error('Not Enrolled');
    }

    const course = await courseModel.findById(proid);
    const lessons = await lessonProgressModel.getLessonsWithProgress(userId, proid);
    const enrollments = await enrollmentModel.getByUser(userId);
    const currentEnrollment = enrollments.find((e) => e.proid === proid);

    const totalLessons = lessons.length;
    const completedLessons = lessons.filter((l) => l.is_completed).length;
    const progress = await lessonProgressModel.getCourseCompletionPercentage(userId, proid);
    const firstLesson = lessons.length > 0 ? lessons[0] : null;

    return {
      course,
      lessons,
      firstLesson,
      enrollment: currentEnrollment,
      progress,
      totalLessons,
      completedLessons,
    };
  },

  async markCourseComplete(userId, proid) {
    await db('enrollment').where({ user_id: userId, proid }).update({ is_completed: true });
    return true;
  },

  async addToWatchlist(userId, proid) {
    return await watchlistModel.add(userId, proid);
  },

  async removeFromWatchlist(userId, proid) {
    return await watchlistModel.remove(userId, proid);
  },

  async getWatchlist(userId) {
    return await watchlistModel.getByUser(userId);
  },

  async submitReview(userId, proid, rating, comment) {
    if (!rating || rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
    // Preserved VULNERABILITY: Stored XSS - comment is not cleansed or escaped here
    return await reviewModel.createOrUpdate(userId, proid, rating, comment);
  },

  async checkReview(userId, proid) {
    return await reviewModel.getUserReview(userId, proid);
  },

  async markLessonComplete(userId, lessonId) {
    const lesson = await lessonModel.findById(lessonId);
    if (!lesson) throw new Error('Lesson not found');

    const isEnrolled = await enrollmentModel.isEnrolled(userId, lesson.proid);
    if (!isEnrolled) throw new Error('Not enrolled');

    await lessonProgressModel.markComplete(userId, lessonId);
    const progress = await lessonProgressModel.getCourseCompletionPercentage(userId, lesson.proid);
    return progress;
  },

  async markLessonIncomplete(userId, lessonId) {
    const lesson = await lessonModel.findById(lessonId);
    if (!lesson) throw new Error('Lesson not found');

    await lessonProgressModel.markIncomplete(userId, lessonId);
    const progress = await lessonProgressModel.getCourseCompletionPercentage(userId, lesson.proid);
    return progress;
  },
};
