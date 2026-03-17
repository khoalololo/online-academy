import courseModel from '../repositories/course.repository.js';
import categoryModel from '../repositories/category.repository.js';
import enrollmentModel from '../repositories/enrollment.repository.js';
import watchlistModel from '../repositories/watchlist.repository.js';
import reviewModel from '../repositories/review.repository.js';
import lessonModel from '../repositories/lesson.repository.js';
import db from '../ultis/db.js';

export const ProductService = {
  async getAllCourses(page, limit) {
    return await courseModel.findAll(page, limit);
  },

  async getCategory(catId) {
    return await categoryModel.findById(catId);
  },

  async getCoursesByCategory(catId, page, limit) {
    const subcategories = await categoryModel.findSubcategories(catId);
    const categoryIds = [catId, ...subcategories.map((sub) => sub.id)];
    return await courseModel.findByCategory(categoryIds, page, limit);
  },

  async searchCourses(searchQuery, catId, sortBy, page, limit) {
    const result = await courseModel.search(searchQuery, catId, sortBy, page, limit);
    const allCategories = await categoryModel.getHierarchicalMenu();
    return { result, allCategories };
  },

  async getCourseDetails(proid, userId = null) {
    const course = await courseModel.findById(proid);
    if (!course) return null;

    await courseModel.incrementViews(proid);

    const relatedResult = await courseModel.findByCategory([course.catid], 1, 6);
    const relatedCourses = relatedResult.courses.filter((c) => c.proid !== proid).slice(0, 5);

    const [enrollmentCount] = await db('enrollment')
      .where('proid', proid)
      .count('user_id as count');

    let isEnrolled = false;
    let isInWatchlist = false;
    let userReview = null;

    if (userId) {
      isEnrolled = await enrollmentModel.isEnrolled(userId, proid);
      isInWatchlist = await watchlistModel.isInWatchlist(userId, proid);
      userReview = await reviewModel.getUserReview(userId, proid);
    }

    const rating = await reviewModel.getCourseRating(proid);
    const ratingDistribution = await reviewModel.getRatingDistribution(proid);
    const reviews = await reviewModel.getByCourse(proid);

    const lessons = await lessonModel.getByCourse(proid);
    const totalDuration = await lessonModel.getTotalDuration(proid);
    const lessonCount = await lessonModel.getLessonCount(proid);

    return {
      course,
      relatedCourses,
      isEnrolled,
      isInWatchlist,
      userReview,
      rating,
      ratingDistribution,
      reviews: reviews.data,
      lessons,
      lessonCount,
      totalDuration: Math.floor(totalDuration / 60),
      studentCount: parseInt(enrollmentCount.count),
    };
  },
};
