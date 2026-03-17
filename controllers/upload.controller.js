import { UploadService } from '../services/upload.service.js';

export const UploadController = {
  async handleAvatarUpload(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      const userId = req.session.authUser.id;
      const avatarPath = await UploadService.handleAvatarUpload(userId, req.file.filename);

      req.session.authUser.avatar = avatarPath;

      res.json({ success: true, message: 'Avatar uploaded successfully', avatarPath });
    } catch (error) {
      console.error('Avatar upload error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async handleAvatarDelete(req, res, next) {
    try {
      const userId = req.session.authUser.id;
      await UploadService.handleAvatarDelete(userId);
      req.session.authUser.avatar = null;

      res.json({ success: true, message: 'Avatar removed' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async handleCourseThumbnailUpload(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      const courseId = req.body.courseId;
      if (!courseId) {
        return res.status(400).json({ success: false, message: 'Course ID is required' });
      }

      const instructorId = req.session.authUser.id;
      const thumbnailPath = await UploadService.handleCourseThumbnailUpload(
        courseId,
        instructorId,
        req.file.filename
      );

      res.json({ success: true, message: 'Thumbnail uploaded successfully', thumbnailPath });
    } catch (error) {
      console.error('Thumbnail upload error:', error);
      res
        .status(error.message === 'Access denied' ? 403 : 500)
        .json({ success: false, message: error.message });
    }
  },

  async handleCourseThumbnailDelete(req, res, next) {
    try {
      const proid = req.params.proid;
      const instructorId = req.session.authUser.id;

      await UploadService.handleCourseThumbnailDelete(proid, instructorId);
      res.json({ success: true, message: 'Thumbnail removed' });
    } catch (error) {
      res
        .status(error.message === 'Access denied' ? 403 : 500)
        .json({ success: false, message: error.message });
    }
  },

  async deleteImage(req, res, next) {
    try {
      const { imagePath } = req.body;
      if (!imagePath) {
        return res.status(400).json({ success: false, message: 'Image path is required' });
      }

      await UploadService.deleteImage(imagePath);
      res.json({ success: true, message: 'Image deleted successfully' });
    } catch (error) {
      console.error('Image deletion error:', error);
      res
        .status(error.message === 'Invalid image path' ? 403 : 500)
        .json({ success: false, message: error.message });
    }
  },
};
