import db from '../ultis/db.js';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export const PERMISSIONS = {
  STUDENT: 1,
  INSTRUCTOR: 2,
  ADMIN: 3
};

export default {
  async findByUsername(username) {
    return await db('users').where('username', username).first();
  },

  async findByEmail(email) {
    return await db('users').where('email', email).first();
  },

  async findById(id) {
    return await db('users').where('id', id).first();
  },

  async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  },

  async hashPassword(plainPassword) {
    return await bcrypt.hash(plainPassword, SALT_ROUNDS);
  },

  async create(userData) {
    const { username, password, name, email, dob, otp_code, otp_expires_at, is_verified = false } = userData;
    const password_hash = await this.hashPassword(password);

    const [user] = await db('users')
      .insert({
        username,
        password_hash,
        name,
        email,
        dob,
        permission_level: PERMISSIONS.STUDENT,
        is_verified,
        otp_code,
        otp_expires_at
      })
      .returning('*');

    return user;
  },

  async usernameExists(username) {
    const [result] = await db('users').where('username', username).count('id as count');
    return parseInt(result.count) > 0;
  },

  async emailExists(email) {
    const [result] = await db('users').where('email', email).count('id as count');
    return parseInt(result.count) > 0;
  },

  async verifyUser(userId) {
    return db("users")
      .where({ id: userId })
      .update({
        is_verified: true,
        otp_code: null,
        otp_expires_at: null
      });
  },


  async updateProfile(userId, data) {
    const updateData = {};
    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email;
    if (data.dob) updateData.dob = data.dob;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.avatar !== undefined) updateData.avatar = data.avatar;

    const [updated] = await db('users').where('id', userId).update(updateData).returning('*');
    return updated;
  },

  async changePassword(userId, oldPassword, newPassword) {
    const user = await this.findById(userId);
    if (!user) throw new Error('User not found');

    const isValid = await this.verifyPassword(oldPassword, user.password_hash);
    if (!isValid) throw new Error('Invalid old password');

    const password_hash = await this.hashPassword(newPassword);
    await db('users').where('id', userId).update({ password_hash });
    return true;
  },

  async updateInstructorProfile(userId, data) {
    const updateData = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.dob !== undefined) updateData.dob = data.dob;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.avatar !== undefined) updateData.avatar = data.avatar;

    const [updated] = await db('users')
      .where('id', userId)
      .update(updateData)
      .returning('*');

    return updated;
  },

  async getInstructorProfile(userId) {
    return await db('users')
      .where('id', userId)
      .where('permission_level', PERMISSIONS.INSTRUCTOR)
      .first();
  },

  async getInstructorPublicInfo(userId) {
    const user = await db('users')
      .select('id', 'name', 'email', 'bio', 'avatar')
      .where('id', userId)
      .first();

    if (!user) return null;
    const courseModel = require('./course.model.js');
    const stats = await courseModel.getInstructorStats(userId);

    return { ...user, stats };
  }

};