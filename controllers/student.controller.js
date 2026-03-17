import { StudentService } from '../services/student.service.js';

export const StudentController = {
  async enroll(req, res, next) {
    try {
      const proid = +req.params.proid;
      const userId = req.session.authUser.id;

      await StudentService.enrollInCourse(userId, proid);

      res.json({ success: true, message: 'Successfully enrolled in the course!' });
    } catch (error) {
      res
        .status(400)
        .json({ success: false, message: error.message || 'Failed to enroll in course.' });
    }
  },

  async getEnrolled(req, res, next) {
    try {
      const userId = req.session.authUser.id;
      const courses = await StudentService.getEnrolledCourses(userId);

      res.render('vwStudent/enrolled', {
        title: 'My Enrolled Courses',
        courses,
      });
    } catch (error) {
      next(error);
    }
  },

  async getLearningPage(req, res, next) {
    try {
      const proid = +req.params.proid;
      const userId = req.session.authUser.id;

      const data = await StudentService.getLearningData(userId, proid);

      res.render('vwStudent/learn', {
        title: `Learn: ${data.course.proname}`,
        course: data.course,
        lessons: data.lessons,
        firstLesson: data.firstLesson,
        enrollment: data.enrollment,
        progress: data.progress,
        totalLessons: data.totalLessons,
        completedLessons: data.completedLessons,
      });
    } catch (error) {
      if (error.message === 'Not Enrolled') {
        return res.redirect(`/products/${req.params.proid}`);
      }
      next(error);
    }
  },

  async markCourseComplete(req, res, next) {
    try {
      const proid = +req.params.proid;
      const userId = req.session.authUser.id;

      await StudentService.markCourseComplete(userId, proid);

      res.json({ success: true, message: 'Congratulations! Course marked as complete!' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async addToWatchlist(req, res, next) {
    try {
      const { proid } = req.body;
      const userId = req.session.authUser.id;

      await StudentService.addToWatchlist(userId, proid);

      res.json({ success: true, message: 'Course added to watchlist!' });
    } catch (error) {
      res
        .status(400)
        .json({ success: false, message: error.message || 'Failed to add to watchlist.' });
    }
  },

  async removeFromWatchlist(req, res, next) {
    try {
      const { proid } = req.body;
      const userId = req.session.authUser.id;

      await StudentService.removeFromWatchlist(userId, proid);

      res.json({ success: true, message: 'Course removed from watchlist!' });
    } catch (error) {
      res
        .status(400)
        .json({ success: false, message: error.message || 'Failed to remove from watchlist.' });
    }
  },

  async getWatchlist(req, res, next) {
    try {
      const userId = req.session.authUser.id;
      const courses = await StudentService.getWatchlist(userId);

      res.render('vwStudent/watchlist', {
        title: 'My Watchlist',
        courses,
      });
    } catch (error) {
      next(error);
    }
  },

  async submitReview(req, res, next) {
    try {
      const proid = +req.params.proid;
      const userId = req.session.authUser.id;
      const { rating, comment } = req.body;

      await StudentService.submitReview(userId, proid, rating, comment);

      res.json({ success: true, message: 'Review submitted successfully!' });
    } catch (error) {
      res
        .status(400)
        .json({ success: false, message: error.message || 'Failed to submit review.' });
    }
  },

  async checkReview(req, res, next) {
    try {
      const proid = +req.params.proid;
      const userId = req.session.authUser.id;

      const review = await StudentService.checkReview(userId, proid);

      res.json({ hasReviewed: !!review, review: review || null });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async markLessonComplete(req, res, next) {
    try {
      const lessonId = +req.params.lessonId;
      const userId = req.session.authUser.id;

      const progress = await StudentService.markLessonComplete(userId, lessonId);

      res.json({ success: true, message: 'Lesson marked as complete!', progress });
    } catch (error) {
      if (error.message === 'Not enrolled')
        return res.status(403).json({ success: false, message: error.message });
      if (error.message === 'Lesson not found')
        return res.status(404).json({ success: false, message: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async markLessonIncomplete(req, res, next) {
    try {
      const lessonId = +req.params.lessonId;
      const userId = req.session.authUser.id;

      const progress = await StudentService.markLessonIncomplete(userId, lessonId);

      res.json({ success: true, message: 'Lesson marked as incomplete', progress });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
};
