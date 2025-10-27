import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import authMdw from '../middlewares/auth.mdw.js';
import courseModel from '../models/course.model.js';

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadDir = 'static/uploads';
['avatars', 'courses', 'instructors'].forEach(folder => {
  const dir = path.join(uploadDir, folder);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadType = req.body.uploadType || 'avatars';
    cb(null, path.join(uploadDir, uploadType));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter - only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// ==================== USER AVATAR UPLOAD ====================
router.post('/avatar', authMdw.isAuthenticated, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const avatarPath = `/static/uploads/avatars/${req.file.filename}`;
    const userId = req.session.authUser.id;

    // Update user avatar in database
    const db = (await import('../ultis/db.js')).default;
    await db('users')
      .where('id', userId)
      .update({ avatar: avatarPath });

    // Update session
    req.session.authUser.avatar = avatarPath;

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      avatarPath: avatarPath
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== USER AVATAR DELETE ====================
router.delete('/avatar', authMdw.isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.authUser.id;
    const db = (await import('../ultis/db.js')).default;
    
    const user = await db('users').where('id', userId).first();
    
    // Delete old avatar file
    if (user.avatar) {
      const fullPath = path.join(process.cwd(), user.avatar);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
    await db('users').where('id', userId).update({ avatar: null });
    req.session.authUser.avatar = null;

    res.json({ success: true, message: 'Avatar removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== COURSE THUMBNAIL UPLOAD ====================
router.post('/course-thumbnail', authMdw.isInstructor, upload.single('thumbnail'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const thumbnailPath = `/static/uploads/courses/${req.file.filename}`;
    const courseId = req.body.courseId;
    if (!courseId) return res.status(400).json({ success: false, message: 'Course ID is required' });

    const course = await courseModel.findById(courseId);
    if (!course || course.instructor_id !== req.session.authUser.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Update course using the model
    const updatedCourse = await courseModel.updateByInstructor(courseId, req.session.authUser.id, {
      thumbnail: thumbnailPath,
      proname: course.proname,      
      tinydes: course.tinydes,
      fulldes: course.fulldes,
      catid: course.catid,
      price: course.price,
      promo_price: course.promo_price
    });

    res.json({
      success: true,
      message: 'Thumbnail uploaded successfully',
      thumbnailPath,
      course: updatedCourse
    });
  } catch (error) {
    console.error('Thumbnail upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});


// ==================== COURSE THUMBNAIL DELETE ====================
router.delete('/course-thumbnail/:proid', authMdw.isInstructor, async (req, res) => {
  try {
    const proid = req.params.proid;
    const course = await courseModel.findById(proid);

    if (!course || course.instructor_id !== req.session.authUser.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Delete file from filesystem
    if (course.thumbnail) {
      const fullPath = path.join(process.cwd(), course.thumbnail);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }

    // Update course model
    await courseModel.updateByInstructor(proid, req.session.authUser.id, {
      proname: course.proname,
      tinydes: course.tinydes,
      fulldes: course.fulldes,
      catid: course.catid,
      price: course.price,
      promo_price: course.promo_price,
      thumbnail: null
    });

    res.json({ success: true, message: 'Thumbnail removed' });
  } catch (error) {
    console.error('Thumbnail delete error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});


// ==================== DELETE IMAGE ====================
router.delete('/image', authMdw.isAuthenticated, async (req, res) => {
  try {
    const { imagePath } = req.body;

    if (!imagePath) {
      return res.status(400).json({ success: false, message: 'Image path is required' });
    }

    // Security: ensure path is within uploads directory
    const fullPath = path.join(process.cwd(), imagePath);
    if (!fullPath.includes('static/uploads')) {
      return res.status(403).json({ success: false, message: 'Invalid image path' });
    }

    // Delete file if exists
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    res.json({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Image deletion error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;