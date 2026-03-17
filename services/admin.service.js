import adminRepository from '../repositories/admin.repository.js';
import categoryRepository from '../repositories/category.repository.js';
import userRepository from '../repositories/user.repository.js';
import db from '../ultis/db.js';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export const AdminService = {
  async getDashboardData() {
    const stats = await adminRepository.getDashboardStats();
    const recentUsers = await adminRepository.getRecentUsers(5);
    const recentCourses = await adminRepository.getRecentCourses(5);
    return { stats, recentUsers, recentCourses };
  },

  async getCategoriesWithCounts() {
    const categories = await categoryRepository.getHierarchicalMenu();
    for (const parent of categories) {
      const [{ count }] = await db('courses').where('catid', parent.id).count('proid as count');
      parent.course_count = parseInt(count);

      for (const sub of parent.subcategories) {
        const [{ count: subCount }] = await db('courses')
          .where('catid', sub.id)
          .count('proid as count');
        sub.course_count = parseInt(subCount);
      }
    }
    return categories;
  },

  async createCategory(name, parent_id) {
    return await categoryRepository.create(name, parent_id || null);
  },

  async updateCategory(id, name, parent_id) {
    return await categoryRepository.update(id, name, parent_id || null);
  },

  async deleteCategory(id) {
    return await categoryRepository.delete(id);
  },

  async getCoursesFilters(page, limit, search, status, categoryId) {
    return await adminRepository.getAllCourses({ page, limit, search, status, categoryId });
  },

  async toggleCourseDisable(proid) {
    return await adminRepository.toggleCourseStatus(proid);
  },

  async deleteCourse(proid) {
    return await adminRepository.deleteCourse(proid);
  },

  async getUsersList(page, limit, role) {
    return await adminRepository.getUsers(page, limit, role);
  },

  async getUserDetails(userId) {
    return await adminRepository.getUserDetails(userId);
  },

  async createInstructor(instructorData) {
    const { username, password, name, email, dob } = instructorData;

    if (await userRepository.usernameExists(username)) {
      throw new Error('Username already exists');
    }
    if (await userRepository.emailExists(email)) {
      throw new Error('Email already exists');
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const [user] = await db('users')
      .insert({
        username,
        password_hash,
        name,
        email,
        dob,
        permission_level: 2,
        is_verified: true,
      })
      .returning('*');

    return user;
  },

  async updateUserRole(targetUserId, currentUserInfo, permission_level) {
    if (![1, 2, 3].includes(permission_level)) {
      throw new Error('Invalid permission level');
    }
    if (targetUserId === currentUserInfo.id) {
      throw new Error('Cannot change your own role');
    }
    return await adminRepository.updateUserRole(targetUserId, permission_level);
  },

  async deleteUser(targetUserId, currentUserInfo) {
    if (targetUserId === currentUserInfo.id) {
      throw new Error('Cannot delete your own account');
    }
    return await adminRepository.deleteUser(targetUserId);
  },

  async toggleUserVerification(userId) {
    return await adminRepository.toggleUserVerification(userId);
  },
};
