import express from 'express';
import authMdw from '../middlewares/auth.mdw.js';
import { AdminController } from '../controllers/admin.controller.js';

const router = express.Router();

router.use(authMdw.isAdmin);

router.get('/dashboard', AdminController.getDashboard);

router.get('/categories', AdminController.getCategories);
router.post('/categories/create', AdminController.createCategory);
router.put('/categories/:id/update', AdminController.updateCategory);
router.delete('/categories/:id/delete', AdminController.deleteCategory);

router.get('/courses', AdminController.getCourses);
router.post('/courses/:proid/toggle-disable', AdminController.toggleCourseDisable);
router.delete('/courses/:proid/delete', AdminController.deleteCourse);

router.get('/users', AdminController.getUsers);
router.get('/users/:id', AdminController.getUserDetails);
router.post('/users/create-instructor', AdminController.createInstructor);
router.put('/users/:id/update-role', AdminController.updateUserRole);
router.delete('/users/:id/delete', AdminController.deleteUser);
router.post('/users/:id/toggle-verification', AdminController.toggleUserVerification);

export default router;
