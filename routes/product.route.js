import express from 'express';
import { ProductController } from '../controllers/product.controller.js';

const router = express.Router();

router.get('/', ProductController.getAllCourses);
router.get('/byCat', ProductController.getCoursesByCategory);
router.get('/search', ProductController.searchCourses);
router.get('/:proid', ProductController.getCourseDetails);

export default router;
