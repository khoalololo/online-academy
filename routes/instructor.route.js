import express from 'express';
import authMdw from '../middlewares/auth.mdw.js';
import courseModel from '../models/course.model.js';
import categoryModel from '../models/category.model.js';
import lessonModel from '../models/lesson.model.js';

const router = express.Router();

// Apply instructor authentication middleware to all routes
router.use(authMdw.isInstructor);

// ==================== DASHBOARD ====================

// [GET] /instructor/dashboard - Instructor dashboard overview
router.get('/dashboard', async (req, res) => {
  try {
    const instructorId = req.session.authUser.id;
    
    // Get instructor statistics
    const stats = await courseModel.getInstructorStats(instructorId);
    
    // Get recent courses (first 5)
    const coursesResult = await courseModel.findByInstructor(instructorId, 1, 5);
    
    res.render('vwInstructor/dashboard', {
      title: 'Instructor Dashboard',
      stats,
      courses: coursesResult.courses
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).render('500', { layout: false });
  }
});

// ==================== COURSE MANAGEMENT ====================

// [GET] /instructor/courses - List all instructor's courses
router.get('/courses', async (req, res) => {
  try {
    const instructorId = req.session.authUser.id;
    
    // TODO: Fetch instructor's courses from database
    // const courses = await courseModel.findByInstructor(instructorId);
    
    res.render('vwInstructor/courses', {
      title: 'My Courses',
      courses: [] // Replace with actual data
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).render('500', { layout: false });
  }
});

// [GET] /instructor/courses/create - Show course creation form
router.get('/courses/create', async (req, res) => {
  try {
    const categories = await categoryModel.getHierarchicalMenu();
    
    res.render('vwInstructor/course-form', {
      title: 'Create New Course',
      categories,
      isEdit: false
    });
  } catch (error) {
    console.error('Error loading create form:', error);
    res.status(500).render('500', { layout: false });
  }
});

// [POST] /instructor/courses/create - Handle course creation
router.post('/courses/create', async (req, res) => {
  try {
    const instructorId = req.session.authUser.id;
    const courseData = {
      ...req.body,
      instructor_id: instructorId
    };
    
    // TODO: Validate course data
    // TODO: Create course in database
    // const newCourse = await courseModel.createByInstructor(courseData);
    
    res.redirect('/instructor/courses');
  } catch (error) {
    console.error('Course creation error:', error);
    res.status(500).render('500', { layout: false });
  }
});

// [GET] /instructor/courses/:proid/edit - Show course edit form
router.get('/courses/:proid/edit', async (req, res) => {
  try {
    const proid = +req.params.proid;
    const instructorId = req.session.authUser.id;
    
    // TODO: Fetch course and verify ownership
    // const course = await courseModel.findById(proid);
    // if (course.instructor_id !== instructorId) {
    //   return res.status(403).send('Access Denied');
    // }
    
    const categories = await categoryModel.getHierarchicalMenu();
    
    res.render('vwInstructor/course-form', {
      title: 'Edit Course',
      categories,
      course: {}, // Replace with actual course data
      isEdit: true
    });
  } catch (error) {
    console.error('Error loading edit form:', error);
    res.status(500).render('500', { layout: false });
  }
});

// [POST] /instructor/courses/:proid/edit - Handle course update
router.post('/courses/:proid/edit', async (req, res) => {
  try {
    const proid = +req.params.proid;
    const instructorId = req.session.authUser.id;
    
    // TODO: Verify ownership
    // TODO: Update course in database
    
    res.redirect(`/instructor/courses/${proid}`);
  } catch (error) {
    console.error('Course update error:', error);
    res.status(500).render('500', { layout: false });
  }
});

// [GET] /instructor/courses/:proid - View course details (instructor view)
router.get('/courses/:proid', async (req, res) => {
  try {
    const proid = +req.params.proid;
    const instructorId = req.session.authUser.id;
    
    // TODO: Fetch course and verify ownership
    // TODO: Get course statistics (enrollments, reviews, etc.)
    
    res.render('vwInstructor/course-detail', {
      title: 'Course Details',
      course: {}, // Replace with actual data
      stats: {} // Enrollment count, revenue, etc.
    });
  } catch (error) {
    console.error('Error loading course details:', error);
    res.status(500).render('500', { layout: false });
  }
});

// [POST] /instructor/courses/:proid/delete - Delete a course
router.post('/courses/:proid/delete', async (req, res) => {
  try {
    const proid = +req.params.proid;
    const instructorId = req.session.authUser.id;
    
    // TODO: Verify ownership
    // TODO: Check if course has enrollments (maybe prevent deletion)
    // TODO: Delete course from database
    
    res.json({ success: true, message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Course deletion error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== LESSON MANAGEMENT ====================

// [GET] /instructor/courses/:proid/lessons - Manage course lessons
router.get('/courses/:proid/lessons', async (req, res) => {
  try {
    const proid = +req.params.proid;
    const instructorId = req.session.authUser.id;
    
    // TODO: Verify course ownership
    // const course = await courseModel.findById(proid);
    // const lessons = await lessonModel.getByCourse(proid);
    
    res.render('vwInstructor/lessons', {
      title: 'Manage Lessons',
      course: {}, // Replace with actual data
      lessons: [] // Replace with actual data
    });
  } catch (error) {
    console.error('Error loading lessons:', error);
    res.status(500).render('500', { layout: false });
  }
});

// [POST] /instructor/courses/:proid/lessons/create - Create new lesson
router.post('/courses/:proid/lessons/create', async (req, res) => {
  try {
    const proid = +req.params.proid;
    const instructorId = req.session.authUser.id;
    
    // TODO: Verify course ownership
    // TODO: Create lesson
    // const lesson = await lessonModel.create({ proid, ...req.body });
    
    res.json({ success: true, message: 'Lesson created successfully' });
  } catch (error) {
    console.error('Lesson creation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// [POST] /instructor/courses/:proid/lessons/:lessonId/update - Update lesson
router.post('/courses/:proid/lessons/:lessonId/update', async (req, res) => {
  try {
    const { proid, lessonId } = req.params;
    const instructorId = req.session.authUser.id;
    
    // TODO: Verify ownership
    // TODO: Update lesson
    
    res.json({ success: true, message: 'Lesson updated successfully' });
  } catch (error) {
    console.error('Lesson update error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// [POST] /instructor/courses/:proid/lessons/:lessonId/delete - Delete lesson
router.post('/courses/:proid/lessons/:lessonId/delete', async (req, res) => {
  try {
    const { proid, lessonId } = req.params;
    const instructorId = req.session.authUser.id;
    
    // TODO: Verify ownership
    // TODO: Delete lesson
    
    res.json({ success: true, message: 'Lesson deleted successfully' });
  } catch (error) {
    console.error('Lesson deletion error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;