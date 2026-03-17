import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import authMdw from '../middlewares/auth.mdw.js';
import { UploadController } from '../controllers/upload.controller.js';

const router = express.Router();

const uploadDir = 'static/uploads';
['avatars', 'courses'].forEach((folder) => {
  const dir = path.join(uploadDir, folder);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let folder = 'avatars'; // default
    if (req.path.includes('/course-thumbnail')) folder = 'courses';
    else if (req.path.includes('/avatar')) folder = 'avatars';
    cb(null, path.join(uploadDir, folder));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (mimetype && extname) return cb(null, true);
  cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter,
});

router.post(
  '/avatar',
  authMdw.isAuthenticated,
  upload.single('avatar'),
  UploadController.handleAvatarUpload
);
router.delete('/avatar', authMdw.isAuthenticated, UploadController.handleAvatarDelete);
router.post(
  '/course-thumbnail',
  authMdw.isInstructor,
  upload.single('thumbnail'),
  UploadController.handleCourseThumbnailUpload
);
router.delete(
  '/course-thumbnail/:proid',
  authMdw.isInstructor,
  UploadController.handleCourseThumbnailDelete
);
router.delete('/image', authMdw.isAuthenticated, UploadController.deleteImage);

export default router;
