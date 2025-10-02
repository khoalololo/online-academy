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
    },

async findById(id) {
        return await db('categories').where('id', id).first();
    },

    async findParentCategories() {
        return await db('categories').whereNull('parent_id').orderBy('name', 'asc');
    },

    async findSubcategories(parentId) {
        return await db('categories').where('parent_id', parentId).orderBy('name', 'asc');
    },

    async getHierarchicalMenu() {
        const parents = await this.findParentCategories();
        return await Promise.all(
            parents.map(async (parent) => {
                const children = await this.findSubcategories(parent.id);
                return { ...parent, subcategories: children };
            })
        );
    },

    async create(name, parentId = null) {
        const [category] = await db('categories')
            .insert({ name, parent_id: parentId })
            .returning('*');
        return category;
    },

    async update(id, name, parentId = null) {
        const updateData = { name };
        if (parentId !== undefined) updateData.parent_id = parentId;
        
        const [updated] = await db('categories')
            .where('id', id)
            .update(updateData)
            .returning('*');
        return updated;
    },

    async delete(id) {
        // Check if category has courses
        const [{ count: courseCount }] = await db('courses').where('catid', id).count('proid as count');
        if (parseInt(courseCount) > 0) {
            throw new Error('Cannot delete category with existing courses');
        }

        // Check if has subcategories
        const [{ count: subCount }] = await db('categories').where('parent_id', id).count('id as count');
        if (parseInt(subCount) > 0) {
            throw new Error('Cannot delete category with existing subcategories');
        }

        await db('categories').where('id', id).del();
        return true;
    }
};