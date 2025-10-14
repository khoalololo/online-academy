import db from '../ultis/db.js';

export default {
    async findTopViewed() {
        return await db('courses')
        .orderBy('views', 'desc').limit(10).select('proid', 'proname', 'tinydes', 'price', 'promo_price', 'views', 'catid');
    },
    async findTopNewest() {
        return await db('courses')
        .orderBy('last_updated', 'desc').limit(10).select('proid', 'proname', 'tinydes', 'price', 'promo_price', 'views', 'catid');
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

    async findByCategory(categoryIds, page = 1, limit = 6) {
        const offset = (page - 1) * limit;

        const ratingsSubquery = db('reviews')
            .select('proid')
            .avg('rating as avg_rating')
            .count('id as rating_count')
            .groupBy('proid')
            .as('ratings');
        
        const courses = await db('courses as c')
        .join('categories as cat', 'c.catid', 'cat.id')
        .join('users as u', 'c.instructor_id', 'u.id')
        .leftJoin(ratingsSubquery, 'c.proid', 'ratings.proid') // Use LEFT JOIN in case a course has no reviews
        .whereIn('c.catid', categoryIds)
        .select(
            'c.proid',
            'c.proname',
            'c.tinydes',
            'c.price',
            'c.promo_price',
            'cat.name as category_name',
            'u.name as instructor_name',
            // Use COALESCE to return 0 instead of null if there are no ratings
            db.raw('COALESCE(ratings.average_rating, 0) as average_rating'),
            db.raw('COALESCE(ratings.rating_count, 0) as rating_count')
        )
        .orderBy('c.last_updated', 'desc')
        .limit(limit)
        .offset(offset);

    const [{ count }] = await db('courses').whereIn('catid', categoryIds).count('proid as count');
    const totalPages = Math.ceil(parseInt(count) / limit);

        return {
        courses,
        pagination: 
            {
                page,
                limit,
                total: parseInt(count),
                totalPages,
            }
        };
    }   
};