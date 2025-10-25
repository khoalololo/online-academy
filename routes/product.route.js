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

    // Get enrollment count
    const enrollmentModel = (await import('../models/enrollment.model.js')).default;
    const db = (await import('../ultis/db.js')).default;
    const [enrollmentCount] = await db('enrollment')
      .where('proid', proid)
      .count('user_id as count');

    // Check if user is enrolled and if course is in watchlist
    let isEnrolled = false;
    let isInWatchlist = false;
    let userReview = null;

    if (req.session.isAuthenticated) {
      const userId = req.session.authUser.id;
      isEnrolled = await enrollmentModel.isEnrolled(userId, proid);
      isInWatchlist = await watchlistModel.isInWatchlist(userId, proid);
      userReview =  await reviewModel.getUserReview(userId, proid);
    }

    // Get course rating and reviews
    const rating = await reviewModel.getCourseRating(proid);
    const ratingDistribution = await reviewModel.getRatingDistribution(proid);
    const reviews = await reviewModel.getByCourse(proid);

    //Get lessons for the course
    const lessons = await lessonModel.getByCourse(proid);
    const totalDuration = await lessonModel.getTotalDuration(proid);
    const lessonCount = await lessonModel.getLessonCount(proid);


    res.render('vwProduct/detail', {
      title: course.proname,
      course,
      relatedCourses,
      isEnrolled,
      isInWatchlist,
      rating,
      ratingDistribution,
      reviews: reviews.data,
      userReview,
      lessons,
      lessonCount,
      totalDuration: Math.floor(totalDuration / 60), // Convert to minutes
      studentCount: parseInt(enrollmentCount.count)
    });

  } catch (error) {
    console.error('Error fetching course details:', error);
    res.status(500).render('500', { layout: false });
  }
});

router.get('/search', async function (req, res) {
  try {
    const query = req.query.q || '';
    const page = +req.query.page || 1;
    const sortBy = req.query.sortBy || 'relevance'; // Default sort by relevance
    const categoryId = +req.query.catid || null;

    let coursesQuery = courseModel.search(query, categoryId);

    // Apply sorting
    switch (sortBy) {
      case 'price_asc':
        coursesQuery = coursesQuery.orderBy('c.price', 'asc');
        break;
      case 'price_desc':
        coursesQuery = coursesQuery.orderBy('c.price', 'desc');
        break;
      case 'rating':
        coursesQuery = coursesQuery.orderBy('ratings.average_rating', 'desc');
        break;
      case 'newest':
        coursesQuery = coursesQuery.orderBy('c.last_updated', 'desc');
        break;
      case 'popular': // Most enrolled
        coursesQuery = coursesQuery
          .leftJoin('enrollment as e', 'c.proid', 'e.proid')
          .groupBy('c.proid', 'c.proname', 'c.tinydes', 'c.price', 'c.promo_price', 'c.views', 'cat.name', 'u.name', 'ratings.average_rating', 'ratings.rating_count', 'c.last_updated') // Include all selected columns in GROUP BY
          .select(db.raw('COUNT(e.user_id) as enrollment_count'))
          .orderBy('enrollment_count', 'desc');
        break;
      case 'relevance':
      default:
        // Default sorting for relevance can be more complex, for now, let's use last_updated
        coursesQuery = coursesQuery.orderBy('c.last_updated', 'desc');
        break;
    }

    const result = await coursesQuery.paginate(page, COURSES_PER_PAGE);

    const categories = await categoryModel.findAll();

    res.render('vwProduct/search', {
      title: `Search results for "${query}"`,
      courses: result.courses,
      pagination: {
        ...result.pagination,
        pageNumbers: generatePageNumbers(1, result.pagination.totalPages),
      },
    });
  } catch (error) {
    console.error('Error fetching search results:', error);
    res.status(500).render('500', { layout: false });
  }
});

export default router;