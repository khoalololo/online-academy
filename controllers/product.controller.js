import { ProductService } from '../services/product.service.js';

const COURSES_PER_PAGE = 6;

function generatePageNumbers(currentPage, totalPages) {
  return Array.from({ length: totalPages }, (_, i) => ({
    value: i + 1,
    isCurrent: i + 1 === currentPage,
  }));
}

export const ProductController = {
  async getAllCourses(req, res, next) {
    try {
      const page = +req.query.page || 1;
      const result = await ProductService.getAllCourses(page, COURSES_PER_PAGE);

      const viewData = {
        categoryName: 'All Courses',
        courses: result.courses,
        pagination: {
          ...result.pagination,
          pageNumbers: generatePageNumbers(page, result.pagination.totalPages),
        },
      };

      res.render('vwProduct/byCat', viewData);
    } catch (error) {
      next(error);
    }
  },

  async getCoursesByCategory(req, res, next) {
    try {
      const catId = +req.query.catid;
      if (!catId) {
        return res.redirect('/products');
      }

      const category = await ProductService.getCategory(catId);
      if (!category) {
        return res.status(404).render('404', { layout: false });
      }

      const page = +req.query.page || 1;
      const result = await ProductService.getCoursesByCategory(catId, page, COURSES_PER_PAGE);

      const viewData = {
        title: category.name,
        categoryName: category.name,
        courses: result.courses,
        pagination: {
          ...result.pagination,
          pageNumbers: generatePageNumbers(page, result.pagination.totalPages),
        },
        catId: catId,
      };

      res.render('vwProduct/byCat', viewData);
    } catch (error) {
      next(error);
    }
  },

  async searchCourses(req, res, next) {
    try {
      const page = +req.query.page || 1;
      const limit = 6;
      const searchQuery = req.query.q || '';
      const catId = +req.query.catid || null;
      const sortBy = req.query.sortBy || 'relevance';

      const { result, allCategories } = await ProductService.searchCourses(
        searchQuery,
        catId,
        sortBy,
        page,
        limit
      );

      const pageNumbers = [];
      if (result.pagination.totalPages > 1) {
        for (let i = 1; i <= result.pagination.totalPages; i++) {
          pageNumbers.push({
            value: i,
            isCurrent: i === page,
          });
        }
      }

      const searchParams = {
        q: searchQuery,
        catid: catId,
        sortBy: sortBy,
      };

      res.render('vwProduct/search', {
        title: `Search results for "${searchQuery}"`,
        courses: result.courses,
        allCategories,
        searchParams,
        pagination: {
          ...result.pagination,
          hasPrev: page > 1,
          hasNext: page < result.pagination.totalPages,
          pageNumbers,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async getCourseDetails(req, res, next) {
    try {
      const proid = +req.params.proid;
      if (isNaN(proid)) {
        return res.status(404).render('404', { layout: false });
      }

      const userId = req.session.isAuthenticated ? req.session.authUser.id : null;
      const details = await ProductService.getCourseDetails(proid, userId);

      if (!details) {
        return res.status(404).render('404', { layout: false });
      }

      res.render('vwProduct/detail', {
        title: details.course.proname,
        course: details.course,
        relatedCourses: details.relatedCourses,
        isEnrolled: details.isEnrolled,
        isInWatchlist: details.isInWatchlist,
        rating: details.rating,
        ratingDistribution: details.ratingDistribution,
        reviews: details.reviews,
        userReview: details.userReview,
        lessons: details.lessons,
        lessonCount: details.lessonCount,
        totalDuration: details.totalDuration,
        studentCount: details.studentCount,
      });
    } catch (error) {
      next(error);
    }
  },
};
