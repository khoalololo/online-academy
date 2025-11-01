import db from '../ultis/db.js';

export default {
    // ==================== DASHBOARD STATISTICS ====================
  /**
   * Get comprehensive dashboard statistics
   */
  async getDashboardStats() {
    // User statistics
    const [{ count: totalUsers }] = await db('users').count('id as count');
    const [{ count: totalStudents }] = await db('users')
      .where('permission_level', 1)
      .count('id as count');
    const [{ count: totalInstructors }] = await db('users')
      .where('permission_level', 2)
      .count('id as count');
    const [{ count: totalAdmins }] = await db('users')
      .where('permission_level', 3)
      .count('id as count');

    // Course statistics
    const [{ count: totalCourses }] = await db('courses').count('proid as count');
    const [{ count: activeCourses }] = await db('courses')
      .where('is_disabled', false)
      .count('proid as count');
    const [{ count: disabledCourses }] = await db('courses')
      .where('is_disabled', true)
      .count('proid as count');

    // Category statistics
    const [{ count: totalCategories }] = await db('categories').count('id as count');
    const [{ count: parentCategories }] = await db('categories')
      .whereNull('parent_id')
      .count('id as count');
    const [{ count: subCategories }] = await db('categories')
      .whereNotNull('parent_id')
      .count('id as count');

    // Enrollment statistics
    const [{ count: totalEnrollments }] = await db('enrollment').count('user_id as count');
    const [{ count: monthlyEnrollments }] = await db('enrollment')
      .where('enroll_date', '>', db.raw("NOW() - INTERVAL '30 days'"))
      .count('user_id as count');

    // Review statistics
    const [{ count: totalReviews }] = await db('reviews').count('id as count');
    const [{ avg: averageRating }] = await db('reviews').avg('rating as avg');

    return {
      totalUsers: parseInt(totalUsers),
      totalStudents: parseInt(totalStudents),
      totalInstructors: parseInt(totalInstructors),
      totalAdmins: parseInt(totalAdmins),
      totalCourses: parseInt(totalCourses),
      activeCourses: parseInt(activeCourses),
      disabledCourses: parseInt(disabledCourses),
      totalCategories: parseInt(totalCategories),
      parentCategories: parseInt(parentCategories),
      subCategories: parseInt(subCategories),
      totalEnrollments: parseInt(totalEnrollments),
      monthlyEnrollments: parseInt(monthlyEnrollments),
      totalReviews: parseInt(totalReviews),
      averageRating: averageRating ? parseFloat(parseFloat(averageRating).toFixed(1)) : 0,
    };
  },

  /**
   * Get recent users (last N users)
   */
  async getRecentUsers(limit = 5) {
    const users = await db('users')
      .select('id', 'name', 'email', 'username', 'permission_level', 'is_verified', 'created_at', 'avatar')
      .orderBy('created_at', 'desc')
      .limit(limit);

    return users;
  },

  /**
   * Get recent courses (last N courses)
   */
  async getRecentCourses(limit = 5) {
    const courses = await db('courses as c')
      .join('users as u', 'c.instructor_id', 'u.id')
      .join('categories as cat', 'c.catid', 'cat.id')
      .leftJoin(
        db('enrollment')
          .select('proid')
          .count('user_id as enrollment_count')
          .groupBy('proid')
          .as('e'),
        'c.proid',
        'e.proid'
      )
      .select(
        'c.proid',
        'c.proname',
        'c.price',
        'c.is_disabled',
        'c.last_updated',
        'u.name as instructor_name',
        'cat.name as category_name',
        db.raw('COALESCE(e.enrollment_count, 0) as enrollment_count')
      )
      .orderBy('c.last_updated', 'desc')
      .limit(limit);

    return courses;
  },

  // ==================== USER MANAGEMENT ====================

  /**
   * Get all users with pagination and filtering
   */
  async getUsers(page = 1, limit = 20, roleFilter = null) {
    const offset = (page - 1) * limit;

    let query = db('users')
      .select('id', 'username', 'name', 'email', 'permission_level', 'is_verified', 'created_at', 'avatar')
      .orderBy('created_at', 'desc');

    if (roleFilter) {
      query = query.where('permission_level', roleFilter);
    }

    const users = await query.limit(limit).offset(offset);

    const [{ count }] = roleFilter
      ? await db('users').where('permission_level', roleFilter).count('id as count')
      : await db('users').count('id as count');

    return {
      users,
      pagination: {
        page,
        limit,
        total: parseInt(count),
        totalPages: Math.ceil(parseInt(count) / limit)
      }
    };
  },

  /**
   * Get user details with statistics
   */
  async getUserDetails(userId) {
    const user = await db('users')
      .where('id', userId)
      .select('id', 'username', 'name', 'email', 'dob', 'permission_level', 'is_verified', 'created_at', 'avatar')
      .first();

    if (!user) return null;

    // Get enrollment count
    const [{ count: enrollmentCount }] = await db('enrollment')
      .where('user_id', userId)
      .count('proid as count');

    // Get review count
    const [{ count: reviewCount }] = await db('reviews')
      .where('user_id', userId)
      .count('id as count');

    // If instructor, get course statistics
    let instructorStats = null;
    if (user.permission_level === 2) {
      const [{ count: courseCount }] = await db('courses')
        .where('instructor_id', userId)
        .count('proid as count');

      const [{ count: studentCount }] = await db('enrollment')
        .join('courses', 'enrollment.proid', 'courses.proid')
        .where('courses.instructor_id', userId)
        .countDistinct('enrollment.user_id as count');

      const [{ count: reviewTotal }] = await db('reviews')
        .join('courses', 'reviews.proid', 'courses.proid')
        .where('courses.instructor_id', userId)
        .count('reviews.id as count');

      const [{ avg: avgRating }] = await db('reviews')
        .join('courses', 'reviews.proid', 'courses.proid')
        .where('courses.instructor_id', userId)
        .avg('reviews.rating as avg');

      instructorStats = {
        totalCourses: parseInt(courseCount),
        totalStudents: parseInt(studentCount),
        totalReviews: parseInt(reviewTotal),
        averageRating: avgRating ? parseFloat(parseFloat(avgRating).toFixed(1)) : 0
      };
    }

    return {
      user,
      enrollmentCount: parseInt(enrollmentCount),
      reviewCount: parseInt(reviewCount),
      instructorStats
    };
  },

  /**
   * Update user role (permission level)
   */
  async updateUserRole(userId, permissionLevel) {
    const [updated] = await db('users')
      .where('id', userId)
      .update({ permission_level: permissionLevel })
      .returning('*');

    return updated;
  },

  /**
   * Toggle user verification status
   */
  async toggleUserVerification(userId) {
    const user = await db('users').where('id', userId).first();
    if (!user) return null;

    const [updated] = await db('users')
      .where('id', userId)
      .update({
        is_verified: !user.is_verified,
        otp_code: null,
        otp_expires_at: null
      })
      .returning('*');

    return updated;
  },

  /**
   * Delete user (admin override)
   * Checks if user is instructor with courses
   */
  async deleteUser(userId) {
    // Check if instructor has courses
    const [{ count: courseCount }] = await db('courses')
      .where('instructor_id', userId)
      .count('proid as count');

    if (parseInt(courseCount) > 0) {
      throw new Error('Cannot delete instructor with existing courses. Reassign or delete courses first.');
    }

    // Delete user (cascade will handle related data)
    await db('users').where('id', userId).del();
    return true;
  },

  // ==================== COURSE MANAGEMENT ====================

  /**
   * Get all courses with filtering, pagination, and search
   */
  async getAllCourses(options = {}) {
    const {
      page = 1,
      limit = 12,
      search = '',
      status = '',
      categoryId = null
    } = options;

    const offset = (page - 1) * limit;

    // Build the base query
    let query = db('courses as c')
      .join('categories as cat', 'c.catid', 'cat.id')
      .join('users as u', 'c.instructor_id', 'u.id')
      .leftJoin(
        db('reviews')
          .select('proid')
          .avg('rating as average_rating')
          .count('id as rating_count')
          .groupBy('proid')
          .as('ratings'),
        'c.proid',
        'ratings.proid'
      )
      .leftJoin(
        db('enrollment')
          .select('proid')
          .count('user_id as enrollment_count')
          .groupBy('proid')
          .as('enrollments'),
        'c.proid',
        'enrollments.proid'
      );

    // Apply search filter (using FTS if search term provided)
    if (search) {
      const normalizedQuery = search.toLowerCase().trim();
      query = query.where(function() {
        // Strategy 1: Exact match (accent-insensitive)
        this.whereRaw(`unaccent(LOWER(c.proname)) LIKE unaccent(LOWER(?))`, [`%${normalizedQuery}%`])
            .orWhereRaw(`unaccent(LOWER(c.tinydes)) LIKE unaccent(LOWER(?))`, [`%${normalizedQuery}%`])
            // Strategy 2: Full-text search (using 'simple' config for admin)
            .orWhereRaw(`c.fts @@ websearch_to_tsquery('simple', ?)`, [search])
            // Strategy 3: Fuzzy match (typo tolerance)
            .orWhereRaw(`similarity(c.search_text_normalized, unaccent(LOWER(?))) > 0.3`, [normalizedQuery]);
      });
    }

    // Apply status filter
    if (status === 'active') {
      query = query.where('c.is_disabled', false);
    } else if (status === 'disabled') {
      query = query.where('c.is_disabled', true);
    }

    // Apply category filter
    if (categoryId) {
      query = query.where('c.catid', categoryId);
    }

    // Get total count for pagination before applying select
    const countQuery = query.clone();
    const [{ count }] = await countQuery.clearSelect().count('c.proid as count');
    const total = parseInt(count);
    const totalPages = Math.ceil(total / limit);

    // Get paginated results with select
    const courses = await query
      .select(
        'c.proid', 'c.proname', 'c.tinydes', 'c.price', 'c.promo_price',
        'c.last_updated', 'c.thumbnail', 'c.is_disabled', 'c.is_completed',
        'cat.name as category_name', 'u.name as instructor_name',
        db.raw('COALESCE(ratings.average_rating, 0) as average_rating'),
        db.raw('COALESCE(ratings.rating_count, 0) as rating_count'),
        db.raw('COALESCE(enrollments.enrollment_count, 0) as enrollment_count')
      )
      .orderBy('c.last_updated', 'desc')
      .limit(limit)
      .offset(offset);

    return {
      courses,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };
  },

  /**
   * Toggle course enabled/disabled status
   */
  async toggleCourseStatus(proid) {
    const course = await db('courses').where('proid', proid).first();
    if (!course) return null;

    const [updated] = await db('courses')
      .where('proid', proid)
      .update({ is_disabled: !course.is_disabled })
      .returning('*');

    return updated;
  },

  /**
   * Delete course with all related data (admin override)
   */
  async deleteCourse(proid) {
    const trx = await db.transaction();

    try {
      // Delete lesson progress
      await trx('lesson_progress')
        .whereIn('lesson_id', trx('lessons').select('id').where('proid', proid))
        .del();

      // Delete lessons
      await trx('lessons').where('proid', proid).del();

      // Delete reviews
      await trx('reviews').where('proid', proid).del();

      // Delete watchlist entries
      await trx('watchlist').where('proid', proid).del();

      // Delete enrollments
      await trx('enrollment').where('proid', proid).del();

      // Delete course
      await trx('courses').where('proid', proid).del();

      await trx.commit();
      return true;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  },

  /**
   * Get course statistics for admin
   */
  async getCourseStats(proid) {
    const course = await db('courses as c')
      .join('users as u', 'c.instructor_id', 'u.id')
      .join('categories as cat', 'c.catid', 'cat.id')
      .where('c.proid', proid)
      .select(
        'c.*',
        'u.name as instructor_name',
        'cat.name as category_name'
      )
      .first();

    if (!course) return null;

    // Get enrollment count
    const [{ count: enrollmentCount }] = await db('enrollment')
      .where('proid', proid)
      .count('user_id as count');

    // Get review statistics
    const [{ count: reviewCount, avg: avgRating }] = await db('reviews')
      .where('proid', proid)
      .select(
        db.raw('COUNT(id) as count'),
        db.raw('AVG(rating) as avg')
      );

    // Get lesson count
    const [{ count: lessonCount }] = await db('lessons')
      .where('proid', proid)
      .count('id as count');

    return {
      course,
      stats: {
        enrollments: parseInt(enrollmentCount),
        reviews: parseInt(reviewCount),
        averageRating: avgRating ? parseFloat(parseFloat(avgRating).toFixed(1)) : 0,
        lessons: parseInt(lessonCount)
      }
    };
  },

  // ==================== CATEGORY MANAGEMENT ====================

  /**
   * Get category with course count and subcategory count
   */
  async getCategoryDetails(categoryId) {
    const category = await db('categories')
      .where('id', categoryId)
      .first();

    if (!category) return null;

    // Get course count
    const [{ count: courseCount }] = await db('courses')
      .where('catid', categoryId)
      .count('proid as count');

    // Get subcategory count
    const [{ count: subCount }] = await db('categories')
      .where('parent_id', categoryId)
      .count('id as count');

    return {
      category,
      courseCount: parseInt(courseCount),
      subcategoryCount: parseInt(subCount)
    };
  },

  /**
   * Check if category can be deleted
   */
  async canDeleteCategory(categoryId) {
    const [{ count: courseCount }] = await db('courses')
      .where('catid', categoryId)
      .count('proid as count');

    const [{ count: subCount }] = await db('categories')
      .where('parent_id', categoryId)
      .count('id as count');

    return {
      canDelete: parseInt(courseCount) === 0 && parseInt(subCount) === 0,
      courseCount: parseInt(courseCount),
      subcategoryCount: parseInt(subCount)
    };
  },

  // ==================== REPORTS & ANALYTICS ====================

  /**
   * Get monthly enrollment trend (last 12 months)
   */
  async getMonthlyEnrollmentTrend() {
    const enrollments = await db('enrollment')
      .select(db.raw("TO_CHAR(enroll_date, 'YYYY-MM') as month"))
      .count('user_id as count')
      .where('enroll_date', '>', db.raw("NOW() - INTERVAL '12 months'"))
      .groupBy(db.raw("TO_CHAR(enroll_date, 'YYYY-MM')"))
      .orderBy(db.raw("TO_CHAR(enroll_date, 'YYYY-MM')"), 'asc');

    return enrollments;
  },

  /**
   * Get top performing courses
   */
  async getTopCourses(limit = 10) {
    const courses = await db('courses as c')
      .join('users as u', 'c.instructor_id', 'u.id')
      .leftJoin(
        db('enrollment')
          .select('proid')
          .count('user_id as enrollment_count')
          .groupBy('proid')
          .as('e'),
        'c.proid',
        'e.proid'
      )
      .leftJoin(
        db('reviews')
          .select('proid')
          .avg('rating as avg_rating')
          .count('id as review_count')
          .groupBy('proid')
          .as('r'),
        'c.proid',
        'r.proid'
      )
      .select(
        'c.proid',
        'c.proname',
        'c.price',
        'u.name as instructor_name',
        db.raw('COALESCE(e.enrollment_count, 0) as enrollment_count'),
        db.raw('COALESCE(r.avg_rating, 0) as avg_rating'),
        db.raw('COALESCE(r.review_count, 0) as review_count')
      )
      .orderBy('enrollment_count', 'desc')
      .limit(limit);

    return courses;
  },

  /**
   * Get top instructors by student count
   */
  async getTopInstructors(limit = 10) {
    const instructors = await db('users as u')
      .join('courses as c', 'u.id', 'c.instructor_id')
      .leftJoin('enrollment as e', 'c.proid', 'e.proid')
      .where('u.permission_level', 2)
      .select(
        'u.id',
        'u.name',
        'u.email'
      )
      .count('c.proid as course_count')
      .countDistinct('e.user_id as student_count')
      .groupBy('u.id', 'u.name', 'u.email')
      .orderBy('student_count', 'desc')
      .limit(limit);

    return instructors;
  }
};