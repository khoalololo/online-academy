import express from 'express';
import courseModel from '../models/course.model.js';
import categoryModel from '../models/category.model.js';

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

    // Fetch all courses since no category is specified
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
      // If catid is missing or invalid, redirect to the "All Courses" page.
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

export default router;