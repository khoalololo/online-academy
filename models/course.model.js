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
      'c.proid', 'c.proname', 'c.tinydes', 'c.price', 'c.promo_price', 'c.last_updated',
      'cat.name as category_name',
      'u.name as instructor_name',
      db.raw('COALESCE(ratings.average_rating, 0) as average_rating'),
      db.raw('COALESCE(ratings.rating_count, 0) as rating_count'),
      db.raw('COALESCE(enrollments.enrollment_count, 0) as enrollment_count')
    );
};

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
                'instructor.email as instructor_email'
            )
            .first();
    },

    async findAll(page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        
        const courses = await _getBaseQuery()
            .select('c.proid', 'c.proname', 'c.tinydes', 'c.price', 'c.promo_price', 'c.views',
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
            .select('c.proid', 'c.proname', 'c.tinydes', 'c.price', 'c.promo_price', 'c.views',
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
        const ftsQuery = `websearch_to_tsquery('simple', ?_query)`;
        const ftsMatch = `c.fts @@ ${ftsQuery}`;

        coursesQuery = coursesQuery.whereRaw(ftsMatch, { _query: query });
        countQuery = countQuery.whereRaw(ftsMatch, { _query: query });
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
            coursesQuery = coursesQuery.orderBy('enrollment_count', 'desc', 'last');
            break;
        case 'newest':
        case 'relevance': // Defaulting relevance to newest
        default:
            coursesQuery = coursesQuery.orderBy('c.last_updated', 'desc');
            break;
        }

        const courses = await coursesQuery.limit(limit).offset(offset);
        const [{ count }] = await countQuery.count('c.proid as count');

        // --- Add 'New' and 'Best Seller' Tags ---
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        courses.forEach(course => {
        if (course.enrollment_count > 50) {
            course.isBestseller = true;
        }
        if (new Date(course.last_updated) > thirtyDaysAgo) {
            course.isNew = true;
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
    }
};