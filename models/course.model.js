import db from '../ultis/db.js';

/**
 * Creates a base query for fetching courses with joins and ratings.
 * This is a private helper function to reduce code duplication.
 * @returns {import('knex').Knex.QueryBuilder}
 */
function _getBaseQuery() {
    const ratingSubquery = db('reviews')
        .select('proid')
        .avg('rating as average_rating')
        .count('rating as rating_count')
        .groupBy('proid')
        .as('ratings');

    return db('courses as c')
        .join('categories as cat', 'c.catid', 'cat.id')
        .join('users as u', 'c.instructor_id', 'u.id')
        .leftJoin(ratingSubquery, 'c.proid', 'ratings.proid');
}

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

    async search(query, page = 1, limit = 10, sortBy = 'relevance', catid = null) {
        const offset = (page - 1) * limit;

        let coursesQuery = _getBaseQuery()
            .select('c.proid', 'c.proname', 'c.tinydes', 'c.price', 'c.promo_price', 'c.views',
                'cat.name as category_name', 'u.name as instructor_name',
                'ratings.average_rating', 'ratings.rating_count', 'c.last_updated')
            .where(function () {
                this.where('c.proname', 'like', `%${query}%`)
                    .orWhere('c.fulldes', 'like', `%${query}%`);
            });

        if (catid) {
            coursesQuery = coursesQuery.andWhere('c.catid', catid);
        }

        let countQuery = db('courses as c').where(function () {
            this.where('c.proname', 'like', `%${query}%`)
                .orWhere('c.fulldes', 'like', `%${query}%`);
        });

        if (catid) {
            countQuery = countQuery.andWhere('c.catid', catid);
        }

        switch (sortBy) {
            case 'price_asc':
                coursesQuery = coursesQuery.orderBy('c.price', 'asc');
                break;
            case 'price_desc':
                coursesQuery = coursesQuery.orderBy('c.price', 'desc');
                break;
            case 'rating':
                coursesQuery = coursesQuery.orderBy('ratings.average_rating', 'desc');
                break;
            case 'newest':
                coursesQuery = coursesQuery.orderBy('c.last_updated', 'desc');
                break;
            case 'popular':
                coursesQuery = coursesQuery
                    .leftJoin('enrollment as e', 'c.proid', 'e.proid')
                    .groupBy('c.proid', 'c.proname', 'c.tinydes', 'c.price', 'c.promo_price', 'c.views', 'cat.name', 'u.name', 'ratings.average_rating', 'ratings.rating_count', 'c.last_updated')
                    .select(db.raw('COUNT(e.user_id) as enrollment_count'))
                    .orderBy('enrollment_count', 'desc');
                break;
            case 'relevance':
            default:
                coursesQuery = coursesQuery.orderBy('c.last_updated', 'desc');
                break;
        }

        const courses = await coursesQuery.limit(limit).offset(offset);
        const [{ count }] = await countQuery.count('c.proid as count');

        courses.forEach(course => {
            if (course.average_rating) course.average_rating = parseFloat(course.average_rating);
            // Add bestseller and new tags
            const enrollmentCount = course.enrollment_count || 0;
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            if (enrollmentCount > 100) { // Define bestseller threshold
                course.isBestseller = true;
            }
            if (new Date(course.last_updated) > thirtyDaysAgo) { // Define new threshold
                course.isNew = true;
            }
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
    }
};