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

    async findByCategory(catid, page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        
        const courses = await db('courses as c')
            .join('categories as cat', 'c.catid', 'cat.id')
            .join('users as u', 'c.instructor_id', 'u.id')
            .where('c.catid', catid)
            .select('c.proid', 'c.proname', 'c.tinydes', 'c.price', 'c.promo_price', 'c.views', 
                    'cat.name as category_name', 'u.name as instructor_name')
            .orderBy('c.last_updated', 'desc')
            .limit(limit)
            .offset(offset);

        const [{ count }] = await db('courses').where('catid', catid).count('proid as count');

        return {
            data: courses,
            pagination: {
                page,
                limit,
                total: parseInt(count),
                totalPages: Math.ceil(parseInt(count) / limit)
            }
        };
    },

    
};