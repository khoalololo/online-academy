import { AdminService } from '../services/admin.service.js';

export const AdminController = {
  async getDashboard(req, res, next) {
    try {
      const data = await AdminService.getDashboardData();
      res.render('vwAdmin/dashboard', {
        title: 'Admin Dashboard',
        ...data,
      });
    } catch (error) {
      next(error);
    }
  },

  async getCategories(req, res, next) {
    try {
      const categories = await AdminService.getCategoriesWithCounts();
      res.render('vwAdmin/categories', {
        title: 'Manage Categories',
        categories,
      });
    } catch (error) {
      next(error);
    }
  },

  async createCategory(req, res, next) {
    try {
      const { name, parent_id } = req.body;
      await AdminService.createCategory(name, parent_id);
      res.json({ success: true, message: 'Category created successfully' });
    } catch (error) {
      res
        .status(400)
        .json({ success: false, message: error.message || 'Failed to create category' });
    }
  },

  async updateCategory(req, res, next) {
    try {
      const id = +req.params.id;
      const { name, parent_id } = req.body;
      await AdminService.updateCategory(id, name, parent_id);
      res.json({ success: true, message: 'Category updated successfully' });
    } catch (error) {
      res
        .status(400)
        .json({ success: false, message: error.message || 'Failed to update category' });
    }
  },

  async deleteCategory(req, res, next) {
    try {
      const id = +req.params.id;
      await AdminService.deleteCategory(id);
      res.json({ success: true, message: 'Category deleted successfully' });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Cannot delete category with existing courses or subcategories',
      });
    }
  },

  async getCourses(req, res, next) {
    try {
      const page = +req.query.page || 1;
      const limit = 12;
      const search = req.query.search || '';
      const status = req.query.status || '';
      const categoryId = req.query.category ? +req.query.category : null;

      const { courses, pagination } = await AdminService.getCoursesFilters(
        page,
        limit,
        search,
        status,
        categoryId
      );

      courses.forEach((course) => {
        if (course.average_rating) {
          course.average_rating = parseFloat(course.average_rating);
        }
      });

      const pageNumbers = [];
      for (let i = 1; i <= pagination.totalPages; i++) {
        pageNumbers.push({ value: i, isCurrent: i === page });
      }

      res.render('vwAdmin/courses', {
        title: 'Manage Courses',
        courses,
        pagination: { ...pagination, pageNumbers },
        searchParams: { search, status, category: categoryId },
      });
    } catch (error) {
      next(error);
    }
  },

  async toggleCourseDisable(req, res, next) {
    try {
      const proid = +req.params.proid;
      const updatedCourse = await AdminService.toggleCourseDisable(proid);

      if (!updatedCourse)
        return res.status(404).json({ success: false, message: 'Course not found' });

      res.json({
        success: true,
        message: updatedCourse.is_disabled
          ? 'Course disabled successfully'
          : 'Course enabled successfully',
        is_disabled: updatedCourse.is_disabled,
      });
    } catch (error) {
      res
        .status(400)
        .json({ success: false, message: error.message || 'Failed to toggle course status' });
    }
  },

  async deleteCourse(req, res, next) {
    try {
      const proid = +req.params.proid;
      await AdminService.deleteCourse(proid);
      res.json({ success: true, message: 'Course deleted successfully' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message || 'Failed to delete course' });
    }
  },

  async getUsers(req, res, next) {
    try {
      const page = +req.query.page || 1;
      const limit = 20;
      const role = req.query.role ? +req.query.role : null;

      const result = await AdminService.getUsersList(page, limit, role);

      const pageNumbers = [];
      for (let i = 1; i <= result.pagination.totalPages; i++) {
        pageNumbers.push({ value: i, isCurrent: i === page });
      }

      res.render('vwAdmin/users', {
        title: 'Manage Users',
        users: result.users,
        currentRole: role,
        pagination: { ...result.pagination, pageNumbers },
      });
    } catch (error) {
      next(error);
    }
  },

  async getUserDetails(req, res, next) {
    try {
      const userId = +req.params.id;
      const data = await AdminService.getUserDetails(userId);

      if (!data) {
        return res
          .status(404)
          .render('404', { layout: false, error: { status: 404, message: 'User Not Found' } });
      }

      res.render('vwAdmin/user-detail', {
        title: `User: ${data.user.name}`,
        ...data,
      });
    } catch (error) {
      next(error);
    }
  },

  async createInstructor(req, res, next) {
    try {
      const user = await AdminService.createInstructor(req.body);
      res.json({
        success: true,
        message: 'Instructor account created successfully',
        user: { id: user.id, username: user.username, name: user.name, email: user.email },
      });
    } catch (error) {
      res
        .status(400)
        .json({ success: false, message: error.message || 'Failed to create instructor account' });
    }
  },

  async updateUserRole(req, res, next) {
    try {
      const targetUserId = +req.params.id;
      const permission_level = +req.body.permission_level;

      await AdminService.updateUserRole(targetUserId, req.session.authUser, permission_level);
      const roleName =
        permission_level === 1 ? 'Student' : permission_level === 2 ? 'Instructor' : 'Admin';
      res.json({ success: true, message: `User role updated to ${roleName}` });
    } catch (error) {
      res
        .status(400)
        .json({ success: false, message: error.message || 'Failed to update user role' });
    }
  },

  async deleteUser(req, res, next) {
    try {
      const targetUserId = +req.params.id;
      await AdminService.deleteUser(targetUserId, req.session.authUser);
      res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async toggleUserVerification(req, res, next) {
    try {
      const userId = +req.params.id;
      const updatedUser = await AdminService.toggleUserVerification(userId);

      if (!updatedUser) return res.status(404).json({ success: false, message: 'User not found' });

      res.json({
        success: true,
        message: updatedUser.is_verified ? 'User verified' : 'User unverified',
        is_verified: updatedUser.is_verified,
      });
    } catch (error) {
      res
        .status(400)
        .json({ success: false, message: error.message || 'Failed to toggle verification' });
    }
  },
};
