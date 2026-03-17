import express from 'express';
import { StudentController } from '../controllers/student.controller.js';
import authMdw from '../middlewares/auth.mdw.js';

const router = express.Router();
router.use(authMdw.isAuthenticated);

router.post('/enroll/:proid', StudentController.enroll);
router.get('/enrolled', StudentController.getEnrolled);

router.get('/learn/:proid', StudentController.getLearningPage);
router.post('/learn/:proid/complete', StudentController.markCourseComplete);

router.post('/watchlist/add', StudentController.addToWatchlist);
router.post('/watchlist/remove', StudentController.removeFromWatchlist);
router.get('/watchlist', StudentController.getWatchlist);

router.post('/review/:proid', StudentController.submitReview);
router.get('/review/:proid/check', StudentController.checkReview);

router.post('/lessons/:lessonId/complete', StudentController.markLessonComplete);
router.post('/lessons/:lessonId/incomplete', StudentController.markLessonIncomplete);

export default router;
