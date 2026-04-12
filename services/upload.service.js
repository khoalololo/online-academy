import db from '../ultis/db.js';
import path from 'path';
import fs from 'fs';

export const UploadService = {
  async handleAvatarUpload(userId, filename) {
    const avatarPath = `/static/uploads/avatars/${filename}`;
    const user = await db('users').where('id', userId).first();

    if (user.avatar && user.avatar !== avatarPath) {
      const allowedBase = path.resolve(process.cwd(), 'static', 'uploads');
      const oldPath = path.resolve(process.cwd(), user.avatar.replace(/^\//, ''));
      if (oldPath.startsWith(allowedBase + path.sep)) {
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
    }

    await db('users').where('id', userId).update({ avatar: avatarPath });
    return avatarPath;
  },

  async handleAvatarDelete(userId) {
    const user = await db('users').where('id', userId).first();

    if (user.avatar) {
      const allowedBase = path.resolve(process.cwd(), 'static', 'uploads');
      const fullPath = path.resolve(process.cwd(), user.avatar.replace(/^\//, ''));
      if (fullPath.startsWith(allowedBase + path.sep)) {
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
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
      const allowedBase = path.resolve(process.cwd(), 'static', 'uploads');
      const fullPath = path.resolve(process.cwd(), course.thumbnail.replace(/^\//, ''));
      if (fullPath.startsWith(allowedBase + path.sep)) {
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }
    }

    await db('courses').where('proid', courseId).update({ thumbnail: null });
    return true;
  },

  async deleteImage(imagePath) {
    const allowedBase = path.resolve(process.cwd(), 'static', 'uploads');
    const fullPath = path.resolve(process.cwd(), imagePath.replace(/^\//, ''));

    if (!fullPath.startsWith(allowedBase + path.sep) && fullPath !== allowedBase) {
      throw new Error('Invalid image path');
    }

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
    return true;
  },
};
