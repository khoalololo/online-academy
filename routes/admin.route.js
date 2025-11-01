import express from 'express';
import authMdw from '../middlewares/auth.mdw.js';
import adminModel from '../models/admin.model.js';
import categoryModel from '../models/category.model.js';
import courseModel from '../models/course.model.js';
import userModel from '../models/user.model.js';
import db from '../ultis/db.js';

const router = express.Router();

router.use(authMdw.isAdmin);

// ==================== DASHBOARD ====================

// [GET] /admin/dashboard - Admin dashboard overview
router.get('/dashboard', async (req, res) => {
  try {
    const stats = await adminModel.getDashboardStats();
    const recentUsers = await adminModel.getRecentUsers(5);
    const recentCourses = await adminModel.getRecentCourses(5);

    res.render('vwAdmin/dashboard', {
      title: 'Admin Dashboard',
      stats,
      recentUsers,
      recentCourses
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).render('500', { 
      layout: false, 
      error: { status: 500, message: 'Internal Server Error' } 
    });
  }
});

// ==================== CATEGORY MANAGEMENT ====================

// [GET] /admin/categories - List all categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await categoryModel.getHierarchicalMenu();
    for (const parent of categories) {
      const [{ count }] = await db('courses').where('catid', parent.id).count('proid as count');
      parent.course_count = parseInt(count);
      
    for (const sub of parent.subcategories) {
        const [{ count: subCount }] = await db('courses').where('catid', sub.id).count('proid as count');
        sub.course_count = parseInt(subCount);
      }
    }

    res.render('vwAdmin/categories', {
      title: 'Manage Categories',
      categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).render('500', { 
      layout: false, 
      error: { status: 500, message: 'Internal Server Error' } 
    });
  }
});

// [POST] /admin/categories/create - Create category
router.post('/categories/create', async (req, res) => {
  try {
    const { name, parent_id } = req.body;
    await categoryModel.create(name, parent_id || null);
    
    res.json({ success: true, message: 'Category created successfully' });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Failed to create category' 
    });
  }
});

// [PUT] /admin/categories/:id/update - Update category
router.put('/categories/:id/update', async (req, res) => {
  try {
    const id = +req.params.id;
    const { name, parent_id } = req.body;
    await categoryModel.update(id, name, parent_id || null);
    
    res.json({ success: true, message: 'Category updated successfully' });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Failed to update category' 
    });
  }
});

// [DELETE] /admin/categories/:id/delete - Delete category
router.delete('/categories/:id/delete', async (req, res) => {
  try {
    const id = +req.params.id;
    await categoryModel.delete(id);
    
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Cannot delete category with existing courses or subcategories' 
    });
  }
});

// ==================== COURSE MANAGEMENT ====================

// [GET] /admin/courses - List all courses with filters
router.get('/courses', async (req, res) => {
  try {
    const page = +req.query.page || 1;
    const limit = 12;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const categoryId = req.query.category ? +req.query.category : null;

    const { courses, pagination } = await adminModel.getAllCourses({
      page,
      limit,
      search,
      status,
      categoryId
    });

    // Format ratings
    courses.forEach(course => {
      if (course.average_rating) {
        course.average_rating = parseFloat(course.average_rating);
      }
    });

    // Generate page numbers
    const pageNumbers = [];
    for (let i = 1; i <= pagination.totalPages; i++) {
      pageNumbers.push({
        value: i,
        isCurrent: i === page
      });
    }

    res.render('vwAdmin/courses', {
      title: 'Manage Courses',
      courses,
      pagination: {
        ...pagination,
        pageNumbers
      },
      searchParams: {
        search,
        status,
        category: categoryId
      }
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).render('500', {
      layout: false,
      error: { status: 500, message: 'Internal Server Error' }
    });
  }
});


// [POST] /admin/courses/:proid/toggle-disable - Enable/Disable course
router.post('/courses/:proid/toggle-disable', async (req, res) => {
  try {
    const proid = +req.params.proid;
    const updatedCourse = await adminModel.toggleCourseStatus(proid);
    
    if (!updatedCourse) {
      return res.status(404).json({ 
        success: false, 
        message: 'Course not found' 
      });
    }

    res.json({ 
      success: true, 
      message: updatedCourse.is_disabled ? 'Course disabled successfully' : 'Course enabled successfully',
      is_disabled: updatedCourse.is_disabled
    });
  } catch (error) {
    console.error('Toggle course error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Failed to toggle course status' 
    });
  }
});

// [DELETE] /admin/courses/:proid/delete - Delete course (admin override)
router.delete('/courses/:proid/delete', async (req, res) => {
  try {
    const proid = +req.params.proid;
    
    await adminModel.deleteCourse(proid);

    res.json({ 
      success: true, 
      message: 'Course deleted successfully' 
    });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Failed to delete course' 
    });
  }
});

// ==================== USER MANAGEMENT ====================

// [GET] /admin/users - List all users
router.get('/users', async (req, res) => {
  try {
    const page = +req.query.page || 1;
    const limit = 20;
    const role = req.query.role ? +req.query.role : null; // Filter by role
    const result = await adminModel.getUsers(page, limit, role);

    const pageNumbers = [];
    for (let i = 1; i <= result.pagination.totalPages; i++) {
      pageNumbers.push({
        value: i,
        isCurrent: i === page
      });
    }

    res.render('vwAdmin/users', {
      title: 'Manage Users',
      users: result.users,
      currentRole: role,
      pagination: {
        ...result.pagination,
        pageNumbers
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).render('500', { 
      layout: false, 
      error: { status: 500, message: 'Internal Server Error' } 
    });
  }
});

// [GET] /admin/users/:id - View user details
router.get('/users/:id', async (req, res) => {
  try {
    const userId = +req.params.id;
    const data = await adminModel.getUserDetails(userId);

    if (!data) {
      return res.status(404).render('404', { 
        layout: false, 
        error: { status: 404, message: 'User Not Found' } 
      });
    }

    res.render('vwAdmin/user-detail', {
      title: `User: ${data.user.name}`,
      user: data.user,
      enrollmentCount: data.enrollmentCount,
      reviewCount: data.reviewCount,
      instructorStats: data.instructorStats
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).render('500', { 
      layout: false, 
      error: { status: 500, message: 'Internal Server Error' } 
    });
  }
});

// [POST] /admin/users/create-instructor - Create instructor account
router.post('/users/create-instructor', async (req, res) => {
  try {
    const { username, password, name, email, dob } = req.body;

    if (await userModel.usernameExists(username)) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }
    if (await userModel.emailExists(email)) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    const password_hash = await userModel.hashPassword(password);

    const [user] = await db('users')
      .insert({
        username,
        password_hash,
        name,
        email,
        dob,
        permission_level: 2, 
        is_verified: true,   
      })
      .returning('*');

    res.json({ 
      success: true, 
      message: 'Instructor account created successfully',
      user: { id: user.id, username: user.username, name: user.name, email: user.email }
    });
  } catch (error) {
    console.error('Create instructor error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Failed to create instructor account' 
    });
  }
});

// [PUT] /admin/users/:id/update-role - Update user permission level
router.put('/users/:id/update-role', async (req, res) => {
  try {
    const userId = +req.params.id;
    const permission_level = +req.body.permission_level;
    if (![1, 2, 3].includes(permission_level)) {
      return res.status(400).json({ success: false, message: 'Invalid permission level' });
    }
    if (userId === req.session.authUser.id) {
      return res.status(400).json({ success: false, message: 'Cannot change your own role' });
    }

    await adminModel.updateUserRole(userId, permission_level);
    
    const roleName = permission_level === 1 ? 'Student' : (permission_level === 2 ? 'Instructor' : 'Admin');
    res.json({ success: true, message: `User role updated to ${roleName}` });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Failed to update user role' 
    });
  }
});

// [DELETE] /admin/users/:id/delete - Delete user
router.delete('/users/:id/delete', async (req, res) => {
  try {
    const userId = +req.params.id;

    if (userId === req.session.authUser.id) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }
    await adminModel.deleteUser(userId);

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message // The model will throw the specific error message
    });
  }
});

// [POST] /admin/users/:id/toggle-verification - Toggle user verification
router.post('/users/:id/toggle-verification', async (req, res) => {
  try {
    const userId = +req.params.id;
    const updatedUser = await adminModel.toggleUserVerification(userId);

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ 
      success: true, 
      message: updatedUser.is_verified ? 'User verified' : 'User unverified',
      is_verified: updatedUser.is_verified
    });
  } catch (error) {
    console.error('Toggle verification error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Failed to toggle verification' 
    });
  }
});

export default router;