import db from '../ultis/db.js';

export default {
    async findAll() {
        try {
            return await db('categories').select('*').orderBy('parent_id', 'asc').orderBy('id', 'asc');
        } catch (error) {
            console.error("Database table 'categories' may not be initialized:", error.message);
            return []; 
        }
    },
    async findTopRegistered() {
    const result = await db('courses')
        .select('categories.id', 'categories.name', db.raw('count(courses.proid) as course_count'))
        .join('categories', 'courses.catid', '=', 'categories.id')
        .groupBy('categories.id', 'categories.name')
        .orderBy('course_count', 'desc')
        .limit(4);
    return result;
    }
};