import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import authMdw from '../middlewares/auth.mdw.js';
import courseModel from '../models/course.model.js';
import categoryModel from '../models/category.model.js';
import lessonModel from '../models/lesson.model.js';

const router = express.Router();

// --- Multer setup for thumbnails ---
const uploadDir = 'static/uploads/courses';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'thumbnail-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilter
});

// --- Video Upload Configuration ---
const videoUploadDir = 'static/uploads/videos';
if (!fs.existsSync(videoUploadDir)) {
  fs.mkdirSync(videoUploadDir, { recursive: true });
}

const videoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, videoUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'video-' + uniqueSuffix + ext);
  }
});

const videoFileFilter = (req, file, cb) => {
  const allowedTypes = /mp4|webm|ogg|mov/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = file.mimetype.startsWith('video/');
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only video files are allowed (mp4, webm, ogg, mov)'));
  }
};

const videoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: videoFileFilter
});

// Apply instructor authentication to all routes
router.use(authMdw.isInstructor);

// ==================== DASHBOARD ====================

// [GET] /instructor/dashboard - Instructor dashboard overview
router.get('/dashboard', async (req, res) => {
  try {
    const instructorId = req.session.authUser.id;
    
    const stats = await courseModel.getInstructorStats(instructorId);
    const coursesResult = await courseModel.findByInstructor(instructorId, 1, 5);
    
    res.render('vwInstructor/dashboard', {
      title: 'Instructor Dashboard',
      stats,
      courses: coursesResult.courses
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).render('error', { 
      layout: false, 
      error: { status: 500, message: 'Internal Server Error' } 
    });
  }
});

// ==================== COURSE MANAGEMENT ====================

// [GET] /instructor/courses - List all instructor's courses
router.get('/courses', async (req, res) => {
  try {
    const instructorId = req.session.authUser.id;
    const page = +req.query.page || 1;
    const limit = 9;
    
    const result = await courseModel.findByInstructor(instructorId, page, limit);
    
    // Generate page numbers for pagination
    const pageNumbers = [];
    for (let i = 1; i <= result.pagination.totalPages; i++) {
      pageNumbers.push({
        value: i,
        isCurrent: i === page
      });
    }
    
    res.render('vwInstructor/courses', {
      title: 'My Courses',
      courses: result.courses,
      pagination: {
        ...result.pagination,
        pageNumbers
      }
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).render('error', { 
      layout: false, 
      error: { status: 500, message: 'Internal Server Error' } 
    });
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
    res.status(500).render('error', { 
      layout: false, 
      error: { status: 500, message: 'Internal Server Error' } 
    });
  }
});

// [POST] /instructor/courses/create - Handle course creation
router.post('/courses/create', upload.single('thumbnail'), async (req, res) => {
  try {
    const instructorId = req.session.authUser.id;
    const courseData = {
      instructor_id: instructorId,
      proname: req.body.proname,
      tinydes: req.body.tinydes,
      fulldes: req.body.fulldes,
      catid: parseInt(req.body.catid),
      price: parseFloat(req.body.price),
      promo_price: req.body.promo_price ? parseFloat(req.body.promo_price) : null
    };

    if (req.file) {
      courseData.thumbnail = `/static/uploads/courses/${req.file.filename}`;
    }
    
    const newCourse = await courseModel.createByInstructor(courseData);
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({ success: true, courseId: newCourse.proid });
    } else {
      return res.redirect(`/instructor/courses/${newCourse.proid}/lessons`);
    }
  } catch (error) {
    console.error('Course creation error:', error);
    const categories = await categoryModel.getHierarchicalMenu();
    res.render('vwInstructor/course-form', {
      title: 'Create New Course',
      categories,
      isEdit: false,
      error_message: 'Failed to create course. Please try again.',
      formData: req.body
    });
  }
});

// [GET] /instructor/courses/:proid/edit - Show course edit form
router.get('/courses/:proid/edit', async (req, res) => {
  try {
    const proid = +req.params.proid;
    const instructorId = req.session.authUser.id;

    const course = await courseModel.findById(proid);
    
    if (!course) {
      return res.status(404).render('error', { 
        layout: false, 
        error: { status: 404, message: 'Course Not Found' } 
      });
    }

    if (course.instructor_id !== instructorId) {
      return res.status(403).render('error', { 
        layout: false, 
        error: { status: 403, message: 'Access Denied' } 
      });
    }
    
    const categories = await categoryModel.getHierarchicalMenu();
    
    res.render('vwInstructor/course-form', {
      title: 'Edit Course',
      categories,
      course,
      isEdit: true
    });
  } catch (error) {
    console.error('Error loading edit form:', error);
    res.status(500).render('error', { 
      layout: false, 
      error: { status: 500, message: 'Internal Server Error' } 
    });
  }
});

// [POST] /instructor/courses/:proid/edit - Handle course update
router.post('/courses/:proid/edit', upload.single('thumbnail'), async (req, res) => {
  try {
    const proid = +req.params.proid;
    const instructorId = req.session.authUser.id;
    
    const courseData = {
      proname: req.body.proname,
      tinydes: req.body.tinydes,
      fulldes: req.body.fulldes,
      catid: parseInt(req.body.catid),
      price: parseFloat(req.body.price),
      promo_price: req.body.promo_price ? parseFloat(req.body.promo_price) : null
    };

    if (req.file) {
      courseData.thumbnail = `/static/uploads/courses/${req.file.filename}`;
    }
    
    await courseModel.updateByInstructor(proid, instructorId, courseData);
    
    res.redirect('/instructor/courses');
  } catch (error) {
    console.error('Course update error:', error);
    const categories = await categoryModel.getHierarchicalMenu();
    const course = await courseModel.findById(+req.params.proid);
    res.render('vwInstructor/course-form', {
      title: 'Edit Course',
      categories,
      course,
      isEdit: true,
      error_message: error.message || 'Failed to update course. Please try again.',
      formData: req.body
    });
  }
});

// [POST] /instructor/courses/:proid/delete - Delete a course
router.post('/courses/:proid/delete', async (req, res) => {
  try {
    const proid = +req.params.proid;
    const instructorId = req.session.authUser.id;
    
    await courseModel.deleteByInstructor(proid, instructorId);
    
    res.json({ success: true, message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Course deletion error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Failed to delete course' 
    });
  }
});

// ==================== LESSON MANAGEMENT ====================

// [GET] /instructor/courses/:proid/lessons - Manage course lessons
router.get('/courses/:proid/lessons', async (req, res) => {
  try {
    const proid = +req.params.proid;
    const instructorId = req.session.authUser.id;
    
    const course = await courseModel.findById(proid);
    
    if (!course) {
      return res.status(404).render('error', { 
        layout: false, 
        error: { status: 404, message: 'Course Not Found' } 
      });
    }

    if (course.instructor_id !== instructorId) {
      return res.status(403).render('error', { 
        layout: false, 
        error: { status: 403, message: 'Access Denied' } 
      });
    }
    
    const lessons = await lessonModel.getByCourse(proid);
    
    res.render('vwInstructor/lessons', {
      title: 'Manage Lessons',
      course,
      lessons
    });
  } catch (error) {
    console.error('Error loading lessons:', error);
    res.status(500).render('error', { 
      layout: false, 
      error: { status: 500, message: 'Internal Server Error' } 
    });
  }
});

// [POST] /instructor/lessons/:proid/add - Create new lesson
router.post('/lessons/:proid/add', async (req, res) => {
  try {
    const proid = +req.params.proid;
    const instructorId = req.session.authUser.id;
    
    // Verify course ownership
    const course = await courseModel.findById(proid);
    if (!course || course.instructor_id !== instructorId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }
    
    // Get the next order index
    const existingLessons = await lessonModel.getByCourse(proid);
    const nextOrderIndex = existingLessons.length;
    
    const lessonData = {
      proid,
      title: req.body.title,
      description: req.body.description || null,
      video_url: req.body.video_url || null,
      duration: req.body.duration || 0,
      order_index: nextOrderIndex,
      is_preview: req.body.is_preview || false
    };
    
    const lesson = await lessonModel.create(lessonData);
    
    res.json({ 
      success: true, 
      message: 'Lesson created successfully',
      lesson 
    });
  } catch (error) {
    console.error('Lesson creation error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Failed to create lesson' 
    });
  }
});

// [GET] /instructor/lessons/:lessonId/get - Get lesson details
router.get('/lessons/:lessonId/get', async (req, res) => {
  try {
    const lessonId = +req.params.lessonId;
    const instructorId = req.session.authUser.id;
    
    const lesson = await lessonModel.findById(lessonId);
    
    if (!lesson) {
      return res.status(404).json({ 
        success: false, 
        message: 'Lesson not found' 
      });
    }
    
    // Verify course ownership
    const course = await courseModel.findById(lesson.proid);
    if (!course || course.instructor_id !== instructorId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }
    
    res.json(lesson);
  } catch (error) {
    console.error('Error fetching lesson:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Failed to fetch lesson' 
    });
  }
});

// [PUT] /instructor/lessons/:lessonId/update - Update lesson
router.put('/lessons/:lessonId/update', async (req, res) => {
  try {
    const lessonId = +req.params.lessonId;
    const instructorId = req.session.authUser.id;
    
    const lesson = await lessonModel.findById(lessonId);
    
    if (!lesson) {
      return res.status(404).json({ 
        success: false, 
        message: 'Lesson not found' 
      });
    }
    
    // Verify course ownership
    const course = await courseModel.findById(lesson.proid);
    if (!course || course.instructor_id !== instructorId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }
    
    const lessonData = {
      title: req.body.title,
      description: req.body.description || null,
      video_url: req.body.video_url || null,
      duration: req.body.duration || 0,
      is_preview: req.body.is_preview || false
    };
    
    const updated = await lessonModel.update(lessonId, lessonData);
    
    res.json({ 
      success: true, 
      message: 'Lesson updated successfully',
      lesson: updated 
    });
  } catch (error) {
    console.error('Lesson update error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Failed to update lesson' 
    });
  }
});

// [DELETE] /instructor/lessons/:lessonId/delete - Delete lesson
router.delete('/lessons/:lessonId/delete', async (req, res) => {
  try {
    const lessonId = +req.params.lessonId;
    const instructorId = req.session.authUser.id;
    
    const lesson = await lessonModel.findById(lessonId);
    
    if (!lesson) {
      return res.status(404).json({ 
        success: false, 
        message: 'Lesson not found' 
      });
    }
    
    // Verify course ownership
    const course = await courseModel.findById(lesson.proid);
    if (!course || course.instructor_id !== instructorId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }
    
    await lessonModel.delete(lessonId);
    
    res.json({ 
      success: true, 
      message: 'Lesson deleted successfully' 
    });
  } catch (error) {
    console.error('Lesson deletion error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Failed to delete lesson' 
    });
  }
});

// [POST] /instructor/lessons/:proid/reorder - Reorder lessons
router.post('/lessons/:proid/reorder', async (req, res) => {
  try {
    const proid = +req.params.proid;
    const instructorId = req.session.authUser.id;
    const { lessonOrders } = req.body;
    
    // Verify course ownership
    const course = await courseModel.findById(proid);
    if (!course || course.instructor_id !== instructorId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }
    
    await lessonModel.reorder(proid, lessonOrders);
    
    res.json({ 
      success: true, 
      message: 'Lessons reordered successfully' 
    });
  } catch (error) {
    console.error('Lesson reorder error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Failed to reorder lessons' 
    });
  }
});

// [POST] /instructor/lessons/:proid/upload-video - Upload video file
router.post('/lessons/:proid/upload-video', authMdw.isInstructor, videoUpload.single('video'), async (req, res) => {
  try {
    const proid = +req.params.proid;
    const instructorId = req.session.authUser.id;
    
    // Verify course ownership
    const course = await courseModel.findById(proid);
    if (!course || course.instructor_id !== instructorId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No video file uploaded' });
    }

    const videoPath = `/static/uploads/videos/${req.file.filename}`;
    
    res.json({ 
      success: true, 
      message: 'Video uploaded successfully',
      videoUrl: videoPath 
    });
  } catch (error) {
    console.error('Video upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// [POST] /instructor/courses/:proid/completion - Toggle course completion status

router.post('/courses/:proid/completion', async (req, res) => {
  try {
    const proid = +req.params.proid;
    const instructorId = req.session.authUser.id;
    const { is_completed } = req.body;

    const course = await courseModel.findById(proid);
    if (!course || course.instructor_id !== instructorId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await courseModel.updateCompletionStatus(proid, is_completed);

    res.json({
      success: true,
      message: `Course marked as ${is_completed ? 'complete' : 'incomplete'} successfully`
    });
  } catch (error) {
    console.error('Course completion toggle error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update course completion status'
    });
  }
});

export default router;
