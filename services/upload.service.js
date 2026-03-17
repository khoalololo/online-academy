import db from '../ultis/db.js';
import path from 'path';
import fs from 'fs';

export const UploadService = {
  async handleAvatarUpload(userId, filename) {
    const avatarPath = `/static/uploads/avatars/${filename}`;
    const user = await db('users').where('id', userId).first();

    // VULNERABILITY PRESERVED: Mass-assignment arbitrary file deletion

    if (user.avatar && user.avatar !== avatarPath) {
      const oldPath = path.join(process.cwd(), user.avatar);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    await db('users').where('id', userId).update({ avatar: avatarPath });
    return avatarPath;
  },

  async handleAvatarDelete(userId) {
    const user = await db('users').where('id', userId).first();

    // VULNERABILITY PRESERVED: Same as above.
    if (user.avatar) {
      const fullPath = path.join(process.cwd(), user.avatar);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    await db('users').where('id', userId).update({ avatar: null });
    return true;
  },

  async handleCourseThumbnailUpload(courseId, instructorId, filename) {
    const thumbnailPath = `/static/uploads/courses/${filename}`;

    const course = await db('courses')
      .where('proid', courseId)
      .where('instructor_id', instructorId)
      .first();

    if (!course) {
      throw new Error('Access denied');
    }

    await db('courses').where('proid', courseId).update({ thumbnail: thumbnailPath });
    return thumbnailPath;
  },

  async handleCourseThumbnailDelete(courseId, instructorId) {
    const course = await db('courses')
      .where('proid', courseId)
      .where('instructor_id', instructorId)
      .first();

    if (!course) {
      throw new Error('Access denied');
    }

    if (course.thumbnail) {
      const fullPath = path.join(process.cwd(), course.thumbnail);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    await db('courses').where('proid', courseId).update({ thumbnail: null });
    return true;
  },

  async deleteImage(imagePath) {
    // VULNERABILITY PRESERVED: Weak path traversal check
    const fullPath = path.join(process.cwd(), imagePath);
    if (!fullPath.includes('static\\uploads') && !fullPath.includes('static/uploads')) {
      throw new Error('Invalid image path');
    }

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
    return true;
  },
};
