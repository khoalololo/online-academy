import express from 'express';
import enrollmentModel from '../models/enrollment.model.js';
import watchlistModel from '../models/watchlist.model.js';
import authMdw from '../middlewares/auth.mdw.js';

const router = express.Router();
router.use(authMdw.isAuthenticated);

// [POST] /student/enroll/:proid - Enroll in a course
router.post('/enroll/:proid', async (req, res) => {
  try {
    const proid = +req.params.proid;
    const userId = req.session.authUser.id;

    await enrollmentModel.enroll(userId, proid);

    res.json({ 
      success: true, 
      message: 'Successfully enrolled in the course!' 
    });

  } catch (error) {
    console.error('Enrollment error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Failed to enroll in course.' 
    });
  }
});

// [GET] /student/enrolled - View enrolled courses
router.get('/enrolled', async (req, res) => {
  try {
    const userId = req.session.authUser.id;
    const enrolledCourses = await enrollmentModel.getByUser(userId);

    res.render('vwStudent/enrolled', {
      title: 'My Enrolled Courses',
      courses: enrolledCourses
    });

  } catch (error) {
    console.error('Error fetching enrolled courses:', error);
    res.status(500).render('500', { layout: false });
  }
});

// ==================== WATCHLIST ====================

// [POST] /student/watchlist/add - Add course to watchlist
router.post('/watchlist/add', async (req, res) => {
  try {
    const { proid } = req.body;
    const userId = req.session.authUser.id;

    await watchlistModel.add(userId, proid);

    res.json({ 
      success: true, 
      message: 'Course added to watchlist!' 
    });

  } catch (error) {
    console.error('Watchlist add error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Failed to add to watchlist.' 
    });
  }
});

// [POST] /student/watchlist/remove - Remove course from watchlist
router.post('/watchlist/remove', async (req, res) => {
  try {
    const { proid } = req.body;
    const userId = req.session.authUser.id;

    await watchlistModel.remove(userId, proid);

    res.json({ 
      success: true, 
      message: 'Course removed from watchlist!' 
    });

  } catch (error) {
    console.error('Watchlist remove error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Failed to remove from watchlist.' 
    });
  }
});

// [GET] /student/watchlist - View watchlist
router.get('/watchlist', async (req, res) => {
  try {
    const userId = req.session.authUser.id;
    const watchlistCourses = await watchlistModel.getByUser(userId);

    res.render('vwStudent/watchlist', {
      title: 'My Watchlist',
      courses: watchlistCourses
    });

  } catch (error) {
    console.error('Error fetching watchlist:', error);
    res.status(500).render('500', { layout: false });
  }
});

export default router;