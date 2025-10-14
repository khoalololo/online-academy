import express from 'express';
import courseModel from '../models/course.model.js';
import categoryModel from '../models/category.model.js';

const router = express.Router();

router.get('/byCat', async function (req, res) {
  const catId = +req.query.catid || -1;
  
  try {
    const category = await categoryModel.findById(catId);

    if (!category) {
      return res.status(404).render('404', { layout: false });
    }

    const page = +req.query.page || 1;
    const limit = 6; // Display 6 courses per page

    // --- Hierarchical Category Logic ---
    // Find all subcategories of the current category
    const subcategories = await categoryModel.findSubcategories(catId);
    
    // Create a list of all relevant category IDs (the parent and all its children)
    const categoryIds = [catId, ...subcategories.map(sub => sub.id)];
    // --- End Hierarchical Logic ---

    const result = await courseModel.findByCategory(categoryIds, page, limit);

    const pageNumbers = [];
    for (let i = 1; i <= result.pagination.totalPages; i++) {
        pageNumbers.push({
            value: i,
            isCurrent: i === page
        });
    }

    res.render('vwProduct/byCat', {
      categoryName: category.name,
      courses: result.courses,
      pagination: {
        ...result.pagination,
        pageNumbers
      },
      catId: catId
    });

  } catch (error) {
    console.error('Error fetching courses by category:', error);
    res.status(500).render('500', { layout: false });
  }
});

// You can add other product-related routes here later
// router.get('/detail', ...);
// router.get('/search', ...);

export default router;