import express from 'express';
import courseModel from '../models/course.model.js';
import categoryModel from '../models/category.model.js';
import enrollmentModel from '../models/enrollment.model.js';
import watchlistModel from '../models/watchlist.model.js';
import reviewModel from '../models/review.model.js';
import lessonModel from '../models/lesson.model.js';

const router = express.Router();
const COURSES_PER_PAGE = 6;

/**
 * Generates an array of page numbers for pagination controls.
 * @param {number} currentPage The current active page.
 * @param {number} totalPages The total number of pages.
 * @returns {Array<{value: number, isCurrent: boolean}>}
 */
function generatePageNumbers(currentPage, totalPages) {
  return Array.from({ length: totalPages }, (_, i) => ({
    value: i + 1,
    isCurrent: i + 1 === currentPage,
  }));
}

router.get('/', async function (req, res) {
  try {
    const page = +req.query.page || 1;
    const result = await courseModel.findAll(page, COURSES_PER_PAGE);

    const viewData = {
      categoryName: 'All Courses',
      courses: result.courses,
      pagination: {
        ...result.pagination,
        pageNumbers: generatePageNumbers(page, result.pagination.totalPages),
      }
    };

    res.render('vwProduct/byCat', viewData);
  } catch (error) {
    console.error('Error fetching all courses:', error);
    res.status(500).render('500', { layout: false });
  }
});

router.get('/byCat', async function (req, res) {
  try {
    const catId = +req.query.catid;
    if (!catId) {
      return res.redirect('/products');
    }

    const category = await categoryModel.findById(catId);
    if (!category) {
      return res.status(404).render('404', { layout: false });
    }

    const page = +req.query.page || 1;
    const subcategories = await categoryModel.findSubcategories(catId);
    const categoryIds = [catId, ...subcategories.map(sub => sub.id)];
    const result = await courseModel.findByCategory(categoryIds, page, COURSES_PER_PAGE);

    const viewData = {
      title: category.name,
      categoryName: category.name,
      courses: result.courses,
      pagination: {
        ...result.pagination,
        pageNumbers: generatePageNumbers(page, result.pagination.totalPages),
      },
      catId: catId
    };

    res.render('vwProduct/byCat', viewData);
  } catch (error) {
    console.error('Error fetching courses by category:', error);
    res.status(500).render('500', { layout: false });
  }
});

// [GET] /products/:proid
router.get('/:proid', async function (req, res) {
  try {
    const proid = +req.params.proid;
    if(isNaN(proid)) {
      return res.status(404).render('404', { layout: false });
    }
    const course = await courseModel.findById(proid);
    if (!course) {
      return res.status(404).render('404', { layout: false });
    }
    // Increment view count
    await courseModel.incrementViews(proid);
    const relatedResult = await courseModel.findByCategory([course.catid], 1, 6);
    const relatedCourses = relatedResult.courses.filter(c => c.proid !== proid).slice(0, 5); // Ensure only 4 related courses

    //check if user is enrolled in course and if course is in user's watchlist
    let isEnrolled = false;
    let isInWatchlist = false;

    if (req.session.isAuthenticated) {
      const userId = req.session.authUser.id;
      isEnrolled = await enrollmentModel.isEnrolled(userId, proid);
      isInWatchlist = await watchlistModel.isInWatchlist(userId, proid);
    }

    // Get course rating and reviews
    const rating = await reviewModel.getCourseRating(proid);
    const ratingDistribution = await reviewModel.getRatingDistribution(proid);
    const reviews = await reviewModel.getByCourse(proid);


    res.render('vwProduct/detail', {
      title: course.proname,
      course,
      relatedCourses,
      isEnrolled,
      isInWatchlist,
      rating,
      ratingDistribution,
      reviews: reviews.data
    });

  } catch (error) {
    console.error('Error fetching course details:', error);
    res.status(500).render('500', { layout: false });
  }
});

export default router;