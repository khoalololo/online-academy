import { InstructorService } from '../services/instructor.service.js';
import fs from 'fs';
import path from 'path';

export const InstructorController = {
  async getDashboard(req, res, next) {
    try {
      const instructorId = req.session.authUser.id;
      const data = await InstructorService.getDashboardData(instructorId);

      res.render('vwInstructor/dashboard', {
        title: 'Instructor Dashboard',
        stats: data.stats,
        courses: data.courses,
      });
    } catch (error) {
      next(error);
    }
  },

  async getCourses(req, res, next) {
    try {
      const instructorId = req.session.authUser.id;
      const page = +req.query.page || 1;
      const limit = 9;

      const result = await InstructorService.getCourses(instructorId, page, limit);

      const pageNumbers = [];
      for (let i = 1; i <= result.pagination.totalPages; i++) {
        pageNumbers.push({ value: i, isCurrent: i === page });
      }

      res.render('vwInstructor/courses', {
        title: 'My Courses',
        courses: result.courses,
        pagination: { ...result.pagination, pageNumbers },
      });
    } catch (error) {
      next(error);
    }
  },

  async getCreateCourse(req, res, next) {
    try {
      const categories = await InstructorService.getCategories();
      res.render('vwInstructor/course-form', {
        title: 'Create New Course',
        categories,
        isEdit: false,
      });
    } catch (error) {
      next(error);
    }
  },

  async postCreateCourse(req, res, next) {
    try {
      const instructorId = req.session.authUser.id;
      const newCourse = await InstructorService.createCourse(instructorId, req.body, req.file);

      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.json({ success: true, courseId: newCourse.proid });
      } else {
        return res.redirect(`/instructor/courses/${newCourse.proid}/lessons`);
      }
    } catch (error) {
      console.error('Course creation error:', error);
      try {
        const categories = await InstructorService.getCategories();
        res.render('vwInstructor/course-form', {
          title: 'Create New Course',
          categories,
          isEdit: false,
          error_message: 'Failed to create course. Please try again.',
          formData: req.body,
        });
      } catch (e) {
        next(e);
      }
    }
  },

  async getEditCourse(req, res, next) {
    try {
      const proid = +req.params.proid;
      const instructorId = req.session.authUser.id;

      const course = await InstructorService.getCourseForEdit(proid, instructorId);
      const categories = await InstructorService.getCategories();

      res.render('vwInstructor/course-form', {
        title: 'Edit Course',
        categories,
        course,
        isEdit: true,
      });
    } catch (error) {
      if (error.message === 'Course Not Found') {
        const err = new Error('Course Not Found');
        err.status = 404;
        return next(err);
      }
      if (error.message === 'Access Denied') {
        const err = new Error('Access Denied');
        err.status = 403;
        return next(err);
      }
      next(error);
    }
  },

  async postEditCourse(req, res, next) {
    try {
      const proid = +req.params.proid;
      const instructorId = req.session.authUser.id;

      await InstructorService.updateCourse(proid, instructorId, req.body, req.file);
      res.redirect('/instructor/courses');
    } catch (error) {
      console.error('Course update error:', error);
      try {
        const categories = await InstructorService.getCategories();
        const course = await InstructorService.getCourseForEdit(
          +req.params.proid,
          req.session.authUser.id
        );
        res.render('vwInstructor/course-form', {
          title: 'Edit Course',
          categories,
          course,
          isEdit: true,
          error_message: error.message || 'Failed to update course. Please try again.',
          formData: req.body,
        });
      } catch (e) {
        next(e);
      }
    }
  },

  async postDeleteCourse(req, res) {
    try {
      const proid = +req.params.proid;
      const instructorId = req.session.authUser.id;

      await InstructorService.deleteCourse(proid, instructorId);
      res.json({ success: true, message: 'Course deleted successfully' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message || 'Failed to delete course' });
    }
  },

  async getLessons(req, res, next) {
    try {
      const proid = +req.params.proid;
      const instructorId = req.session.authUser.id;

      const { course, lessons } = await InstructorService.getCourseLessons(proid, instructorId);

      res.render('vwInstructor/lessons', {
        title: 'Manage Lessons',
        course,
        lessons,
      });
    } catch (error) {
      if (error.message === 'Course Not Found') {
        const err = new Error('Course Not Found');
        err.status = 404;
        return next(err);
      }
      if (error.message === 'Access Denied') {
        const err = new Error('Access Denied');
        err.status = 403;
        return next(err);
      }
      next(error);
    }
  },

  async postAddLesson(req, res) {
    try {
      const proid = +req.params.proid;
      const instructorId = req.session.authUser.id;

      const lesson = await InstructorService.createLesson(proid, instructorId, req.body);
      res.json({ success: true, message: 'Lesson created successfully', lesson });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message || 'Failed to create lesson' });
    }
  },

  async getLesson(req, res) {
    try {
      const lessonId = +req.params.lessonId;
      const instructorId = req.session.authUser.id;

      const lesson = await InstructorService.getLessonForAPI(lessonId, instructorId);
      res.json(lesson);
    } catch (error) {
      res
        .status(error.message.includes('not found') ? 404 : 403)
        .json({ success: false, message: error.message });
    }
  },

  async putUpdateLesson(req, res) {
    try {
      const lessonId = +req.params.lessonId;
      const instructorId = req.session.authUser.id;

      const updated = await InstructorService.updateLesson(lessonId, instructorId, req.body);
      res.json({ success: true, message: 'Lesson updated successfully', lesson: updated });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message || 'Failed to update lesson' });
    }
  },

  async deleteLesson(req, res) {
    try {
      const lessonId = +req.params.lessonId;
      const instructorId = req.session.authUser.id;

      await InstructorService.deleteLesson(lessonId, instructorId);
      res.json({ success: true, message: 'Lesson deleted successfully' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message || 'Failed to delete lesson' });
    }
  },

  async postReorderLessons(req, res) {
    try {
      const proid = +req.params.proid;
      const instructorId = req.session.authUser.id;

      await InstructorService.reorderLessons(proid, instructorId, req.body.lessonOrders);
      res.json({ success: true, message: 'Lessons reordered successfully' });
    } catch (error) {
      res
        .status(400)
        .json({ success: false, message: error.message || 'Failed to reorder lessons' });
    }
  },

  async postUploadVideo(req, res) {
    try {
      const proid = +req.params.proid;
      const instructorId = req.session.authUser.id;

      await InstructorService.verifyVideoUploadAccess(proid, instructorId);

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No video file uploaded' });
      }

      const videoPath = `/static/uploads/videos/${req.file.filename}`;
      res.json({ success: true, message: 'Video uploaded successfully', videoUrl: videoPath });
    } catch (error) {
      if (req.file) {
        const filePath = path.join(process.cwd(), 'static/uploads/videos', req.file.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      res
        .status(error.message === 'Access denied' ? 403 : 500)
        .json({ success: false, message: error.message });
    }
  },

  async postToggleCompletion(req, res) {
    try {
      const proid = +req.params.proid;
      const instructorId = req.session.authUser.id;
      const { is_completed } = req.body;

      await InstructorService.toggleCourseCompletion(proid, instructorId, is_completed);
      res.json({
        success: true,
        message: `Course marked as ${is_completed ? 'complete' : 'incomplete'} successfully`,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update course completion status',
      });
    }
  },
};
