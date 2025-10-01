import db from '../ultis/db.js';

export default {
    async findAll() {
        try {
            return await db('categories').select('*').orderBy('parent_id', 'asc').orderBy('id', 'asc');
        } catch (error) {
            console.error("Database table 'categories' may not be initialized:", error.message);
            return []; 
        }
    }
};