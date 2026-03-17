import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import authMdw from '../middlewares/auth.mdw.js';
import { InstructorController } from '../controllers/instructor.controller.js';

const router = express.Router();

const uploadDir = 'static/uploads/courses';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'thumbnail-' + uniqueSuffix + ext);
  },
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
  fileFilter: fileFilter,
});

const videoUploadDir = 'static/uploads/videos';
if (!fs.existsSync(videoUploadDir)) {
  fs.mkdirSync(videoUploadDir, { recursive: true });
}

const videoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, videoUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'video-' + uniqueSuffix + ext);
  },
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
  fileFilter: videoFileFilter,
});

router.use(authMdw.isInstructor);

router.get('/dashboard', InstructorController.getDashboard);

router.get('/courses', InstructorController.getCourses);

router.get('/courses/create', InstructorController.getCreateCourse);
router.post('/courses/create', upload.single('thumbnail'), InstructorController.postCreateCourse);

router.get('/courses/:proid/edit', InstructorController.getEditCourse);
router.post(
  '/courses/:proid/edit',
  upload.single('thumbnail'),
  InstructorController.postEditCourse
);

router.post('/courses/:proid/delete', InstructorController.postDeleteCourse);

router.get('/courses/:proid/lessons', InstructorController.getLessons);

router.post('/lessons/:proid/add', InstructorController.postAddLesson);

router.get('/lessons/:lessonId/get', InstructorController.getLesson);
router.put('/lessons/:lessonId/update', InstructorController.putUpdateLesson);
router.delete('/lessons/:lessonId/delete', InstructorController.deleteLesson);
router.post('/lessons/:proid/reorder', InstructorController.postReorderLessons);

router.post(
  '/lessons/:proid/upload-video',
  videoUpload.single('video'),
  InstructorController.postUploadVideo
);
router.post('/courses/:proid/completion', InstructorController.postToggleCompletion);

export default router;
