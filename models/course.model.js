import db from '../ultis/db.js';

/**
 * Creates a base query for fetching courses with joins and ratings.
 * This is a private helper function to reduce code duplication.
 * @returns {import('knex').Knex.QueryBuilder}
 */

// A subquery to get average rating and count
const _getRatingSubquery = () => {
  return db('reviews')
    .select('proid')
    .avg('rating as average_rating')
    .count('id as rating_count')
    .groupBy('proid')
    .as('ratings');
};

// A subquery to get enrollment count (for 'Best Seller')
const _getEnrollmentSubquery = () => {
  return db('enrollment')
    .select('proid')
    .count('user_id as enrollment_count')
    .groupBy('proid')
    .as('enrollments');
};

// Base query with all common joins
const _getBaseQuery = () => {
  return db('courses as c')
    .join('categories as cat', 'c.catid', 'cat.id')
    .join('users as u', 'c.instructor_id', 'u.id')
    .leftJoin(_getRatingSubquery(), 'c.proid', 'ratings.proid')
    .leftJoin(_getEnrollmentSubquery(), 'c.proid', 'enrollments.proid')
    .select(
      'c.proid', 'c.proname', 'c.thumbnail', 'c.tinydes', 'c.price', 'c.promo_price', 'c.last_updated',
      'cat.name as category_name',
      'u.name as instructor_name',
      db.raw('COALESCE(ratings.average_rating, 0) as average_rating'),
      db.raw('COALESCE(ratings.rating_count, 0) as rating_count'),
      db.raw('COALESCE(enrollments.enrollment_count, 0) as enrollment_count')
    );
};

export const getBaseQuery = _getBaseQuery;

export default {
    async findTopViewed() {
        const courses = await _getBaseQuery()
            .select('c.proid', 'c.proname', 'c.tinydes', 'c.price', 'c.promo_price', 'c.views',
                'cat.name as category_name', 'u.name as instructor_name',
                'ratings.average_rating', 'ratings.rating_count')
            .orderBy('c.views', 'desc')
            .limit(10);

        courses.forEach(course => {
            if (course.average_rating) course.average_rating = parseFloat(course.average_rating);
        });
        return courses;
    },
    async findTopNewest() {
        const courses = await _getBaseQuery()
            .select('c.proid', 'c.proname', 'c.tinydes', 'c.price', 'c.promo_price', 'c.views',
                'cat.name as category_name', 'u.name as instructor_name',
                'ratings.average_rating', 'ratings.rating_count')
            .orderBy('c.last_updated', 'desc')
            .limit(10);

        courses.forEach(course => {
            if (course.average_rating) course.average_rating = parseFloat(course.average_rating);
        });
        return courses;
    },
    async findById(proid) {
        return await db('courses as c')
            .join('categories as cat', 'c.catid', 'cat.id')
            .join('users as instructor', 'c.instructor_id', 'instructor.id')
            .leftJoin('categories as parent_cat', 'cat.parent_id', 'parent_cat.id')
            .where('c.proid', proid)
            .select(
                'c.*',
                'cat.name as category_name',
                'cat.id as catid',
                'parent_cat.name as parent_category_name',
                'instructor.name as instructor_name',
                'instructor.email as instructor_email',
                'instructor.bio as instructor_bio'
            )
            .first();
    },

    async findAll(page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        
        const courses = await _getBaseQuery()
            .select('c.proid', 'c.proname', 'c.thumbnail',  'c.tinydes', 'c.price', 'c.promo_price', 'c.views',
                'cat.name as category_name', 'u.name as instructor_name',
                'ratings.average_rating', 'ratings.rating_count')
            .orderBy('c.last_updated', 'desc')
            .limit(limit)
            .offset(offset);
        const [{ count }] = await db('courses').count('proid as count');

        // Ensure average_rating is a number, not a string from the DB.
        courses.forEach(course => {
            if (course.average_rating) course.average_rating = parseFloat(course.average_rating);
        });

        return {
            courses: courses,
            pagination: {
                page,
                limit,
                total: parseInt(count),
                totalPages: Math.ceil(parseInt(count) / limit)
            }
        };
    },

    async findByCategory(catid, page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        
        const courses = await _getBaseQuery()
            .whereIn('c.catid', Array.isArray(catid) ? catid : [catid])
            .select('c.proid', 'c.proname', 'c.thumbnail', 'c.tinydes', 'c.price', 'c.promo_price', 'c.views',
                'cat.name as category_name', 'u.name as instructor_name',
                'ratings.average_rating', 'ratings.rating_count')
            .orderBy('c.last_updated', 'desc')
            .limit(limit)
            .offset(offset);
        const [{ count }] = await db('courses').whereIn('catid', Array.isArray(catid) ? catid : [catid]).count('proid as count');

        // Ensure average_rating is a number, not a string from the DB.
        courses.forEach(course => {
            if (course.average_rating) course.average_rating = parseFloat(course.average_rating);
        });

        return {
            courses: courses,
            pagination: {
                page,
                limit,
                total: parseInt(count),
                totalPages: Math.ceil(parseInt(count) / limit)
            }
        };
    },

    async incrementViews(proid) {
        return await db('courses')
            .where('proid', proid)
            .increment('views', 1);
    },

    async search(query, catid = null, sortBy = 'relevance', page = 1, limit = 6) {
        const offset = (page - 1) * limit;
        let coursesQuery = _getBaseQuery();
        let countQuery = db('courses as c');

        if (query) {
            // Fixed: Use proper Knex parameter binding
            const ftsMatch = `c.fts @@ websearch_to_tsquery('simple', ?)`;
            
            coursesQuery = coursesQuery.whereRaw(ftsMatch, [query]);
            countQuery = countQuery.whereRaw(ftsMatch, [query]);
        }

        if (catid) {
            coursesQuery = coursesQuery.andWhere('c.catid', catid);
            countQuery = countQuery.andWhere('c.catid', catid);
        }

        switch (sortBy) {
            case 'price_asc':
                coursesQuery = coursesQuery.orderBy(db.raw('COALESCE(c.promo_price, c.price)'), 'asc');
                break;
            case 'rating':
                coursesQuery = coursesQuery.orderBy([
                    { column: 'average_rating', order: 'desc', nulls: 'last' },
                    { column: 'rating_count', order: 'desc' }
                ]);
                break;
            case 'popular':
                coursesQuery = coursesQuery.orderBy('enrollment_count', 'desc');
                break;
            case 'newest':
            case 'relevance': // Defaulting relevance to newest
            default:
                coursesQuery = coursesQuery.orderBy('c.last_updated', 'desc');
                break;
        }

        const courses = await coursesQuery.limit(limit).offset(offset);
        const [{ count }] = await countQuery.count('c.proid as count');

        // Add 'New' and 'Best Seller' Tags
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        courses.forEach(course => {
            if (course.enrollment_count > 50) {
                course.isBestseller = true;
            }
            if (new Date(course.last_updated) > thirtyDaysAgo) {
                course.isNew = true;
            }
            // Ensure average_rating is a number
            if (course.average_rating) {
                course.average_rating = parseFloat(parseFloat(course.average_rating).toFixed(1));
            }
        });

        return {
            courses,
            pagination: {
                page,
                limit,
                total: parseInt(count),
                totalPages: Math.ceil(parseInt(count) / limit)
            }
        };
    },

    // ==================== INSTRUCTOR METHODS ====================

    /**
     * Find all courses by instructor
     */
    async findByInstructor(instructorId, page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        
        const courses = await _getBaseQuery()
            .where('c.instructor_id', instructorId)
            .select('c.proid', 'c.proname', 'c.thumbnail', 'c.tinydes', 'c.price', 'c.promo_price',
                    'c.last_updated',
                    'cat.name as category_name',
                    'ratings.average_rating', 'ratings.rating_count',
                    'enrollments.enrollment_count')
            .orderBy('c.last_updated', 'desc')
            .limit(limit)
            .offset(offset);

        const [{ count }] = await db('courses')
            .where('instructor_id', instructorId)
            .count('proid as count');

        courses.forEach(course => {
            if (course.average_rating) course.average_rating = parseFloat(course.average_rating);
        });

        return {
            courses,
            pagination: {
                page,
                limit,
                total: parseInt(count),
                totalPages: Math.ceil(parseInt(count) / limit)
            }
        };
    },

    /**
     * Create a new course (instructor)
     */
    async createByInstructor(courseData) {
        const {
            instructor_id,
            proname,
            tinydes,
            fulldes,
            catid,
            price,
            promo_price
        } = courseData;

        const [course] = await db('courses')
            .insert({
                instructor_id,
                proname,
                tinydes,
                fulldes,
                catid,
                price: parseFloat(price),
                promo_price: promo_price ? parseFloat(promo_price) : null,
                views: 0,
                is_disabled: false,
                last_updated: db.fn.now()
            })
            .returning('*');

        return course;
    },

    /**
     * Update course (instructor)
     */
    async updateByInstructor(proid, instructorId, courseData) {
        // First verify ownership
        const course = await db('courses')
            .where({ proid, instructor_id: instructorId })
            .first();
        
        if (!course) {
            throw new Error('Course not found or access denied');
        }

        const updateData = {
            proname: courseData.proname,
            tinydes: courseData.tinydes,
            fulldes: courseData.fulldes,
            catid: courseData.catid,
            price: parseFloat(courseData.price),
            last_updated: db.fn.now()
        };

        if (courseData.promo_price) {
            updateData.promo_price = parseFloat(courseData.promo_price);
        }

        const [updated] = await db('courses')
            .where({ proid, instructor_id: instructorId })
            .update(updateData)
            .returning('*');

        return updated;
    },

    /**
     * Delete course (only if no enrollments)
     */
    async deleteByInstructor(proid, instructorId) {
        // Verify ownership
        const course = await db('courses')
            .where({ proid, instructor_id: instructorId })
            .first();
        
        if (!course) {
            throw new Error('Course not found or access denied');
        }

        // Check for enrollments
        const [{ count: enrollCount }] = await db('enrollment')
            .where('proid', proid)
            .count('user_id as count');

        if (parseInt(enrollCount) > 0) {
            throw new Error('Cannot delete course with existing enrollments. You can disable it instead.');
        }

        // Delete related data first
        await db('lessons').where('proid', proid).del();
        await db('reviews').where('proid', proid).del();
        await db('watchlist').where('proid', proid).del();

        // Delete the course
        await db('courses').where({ proid, instructor_id: instructorId }).del();
        
        return true;
    },

    /**
     * Get instructor dashboard statistics
     */
    async getInstructorStats(instructorId) {
        // Total courses
        const [{ count: totalCourses }] = await db('courses')
            .where('instructor_id', instructorId)
            .count('proid as count');

        // Total students (unique enrollments across all courses)
        const [{ count: totalStudents }] = await db('enrollment')
            .join('courses', 'enrollment.proid', 'courses.proid')
            .where('courses.instructor_id', instructorId)
            .countDistinct('enrollment.user_id as count');

        // Total reviews
        const [{ count: totalReviews }] = await db('reviews')
            .join('courses', 'reviews.proid', 'courses.proid')
            .where('courses.instructor_id', instructorId)
            .count('reviews.id as count');

        // Average rating
        const [{ avg: avgRating }] = await db('reviews')
            .join('courses', 'reviews.proid', 'courses.proid')
            .where('courses.instructor_id', instructorId)
            .avg('reviews.rating as avg');

        return {
            totalCourses: parseInt(totalCourses),
            totalStudents: parseInt(totalStudents),
            totalReviews: parseInt(totalReviews),
            averageRating: avgRating ? parseFloat(parseFloat(avgRating).toFixed(1)) : 0
        };
    },

/**
 * Update course completion status (instructor)
 */

    async updateCompletionStatus(proid, is_completed) {
        const [updated] = await db('courses')
        .where({ proid })
        .update({
        is_completed,
        last_updated: db.fn.now()
        })
        .returning('*');

    return updated;
    }

};