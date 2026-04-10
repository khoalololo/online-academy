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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
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