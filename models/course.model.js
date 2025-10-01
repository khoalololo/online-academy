import db from '../ultis/db.js';

export default {
    async findTopViewed() {
        return await db('courses')
        .orderBy('views', 'desc').limit(10).select('proid', 'proname', 'tinydes', 'price', 'promo_price', 'views', 'catid');
    },
    async findTopNewest() {
        return await db('courses')
        .orderBy('last_updated', 'desc').limit(10).select('proid', 'proname', 'tinydes', 'price', 'promo_price', 'views', 'catid');
    }
};