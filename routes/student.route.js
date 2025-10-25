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

// ==================== LEARNING PAGE ====================

// [GET] /student/learn/:proid - Course learning page
router.get('/learn/:proid', async (req, res) => {
  try {
    const proid = +req.params.proid;
    const userId = req.session.authUser.id;

    // Check if user is enrolled
    const isEnrolled = await enrollmentModel.isEnrolled(userId, proid);
    if (!isEnrolled) {
      return res.redirect(`/products/${proid}`);
    }

    // Get course details
    const course = await courseModel.findById(proid);
    const lessons = await lessonModel.getByCourse(proid);
    const enrollments = await enrollmentModel.getByUser(userId);
    const currentEnrollment = enrollments.find(e => e.proid === proid);

    // Calculate progress
    const totalLessons = lessons.length;
    const completedLessons = 0; // TODO: Track lesson completion
    const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    res.render('vwStudent/learn', {
      title: `Learn: ${course.proname}`,
      course,
      lessons,
      enrollment: currentEnrollment,
      progress,
      totalLessons,
      completedLessons
    });
  } catch (error) {
    console.error('Error loading learning page:', error);
    res.status(500).render('500', { layout: false });
  }
});

// [POST] /student/learn/:proid/complete - Mark course as complete
router.post('/learn/:proid/complete', async (req, res) => {
  try {
    const proid = +req.params.proid;
    const userId = req.session.authUser.id;

    // Update enrollment to completed
    const db = (await import('../ultis/db.js')).default;
    await db('enrollment')
      .where({ user_id: userId, proid })
      .update({ is_completed: true });

    res.json({ 
      success: true, 
      message: 'Congratulations! Course marked as complete!' 
    });
  } catch (error) {
    console.error('Complete course error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
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

// ==================== REVIEWS ====================

// [POST] /student/review/:proid - Submit or update a review
router.post('/review/:proid', async (req, res) => {
  try {
    const proid = +req.params.proid;
    const userId = req.session.authUser.id;
    const { rating, comment } = req.body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ 
        success: false, 
        message: 'Rating must be between 1 and 5' 
      });
    }

    await reviewModel.createOrUpdate(userId, proid, rating, comment);

    res.json({ 
      success: true, 
      message: 'Review submitted successfully!' 
    });
  } catch (error) {
    console.error('Review submission error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Failed to submit review.' 
    });
  }
});

// [GET] /student/review/:proid/check - Check if user has reviewed
router.get('/review/:proid/check', async (req, res) => {
  try {
    const proid = +req.params.proid;
    const userId = req.session.authUser.id;

    const review = await reviewModel.getUserReview(userId, proid);

    res.json({ 
      hasReviewed: !!review,
      review: review || null
    });
  } catch (error) {
    console.error('Review check error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

export default router;