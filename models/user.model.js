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
    const { username, password, name, email, dob } = userData;
    const password_hash = await this.hashPassword(password);

    const [user] = await db('users')
      .insert({ username, password_hash, name, email, dob, permission_level: PERMISSIONS.STUDENT })
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

  async updateProfile(userId, data) {
    const updateData = {};
    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email;
    if (data.dob) updateData.dob = data.dob;

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
  }
};