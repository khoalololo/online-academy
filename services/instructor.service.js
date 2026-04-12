import courseModel from '../repositories/course.repository.js';
import lessonModel from '../repositories/lesson.repository.js';
import categoryModel from '../repositories/category.repository.js';

export const InstructorService = {
  async getDashboardData(instructorId) {
    const stats = await courseModel.getInstructorStats(instructorId);
    const coursesResult = await courseModel.findByInstructor(instructorId, 1, 5);
    return { stats, courses: coursesResult.courses };
  },

  async getCourses(instructorId, page, limit) {
    return await courseModel.findByInstructor(instructorId, page, limit);
  },

  async getCategories() {
    return await categoryModel.getHierarchicalMenu();
  },

  async createCourse(instructorId, courseData, thumbnailFile) {
    const data = {
      instructor_id: instructorId,
      proname: courseData.proname,
      tinydes: courseData.tinydes,
      fulldes: courseData.fulldes,
      catid: parseInt(courseData.catid),
      price: parseFloat(courseData.price),
      promo_price: courseData.promo_price ? parseFloat(courseData.promo_price) : null,
    };

    if (thumbnailFile) {
      data.thumbnail = `/static/uploads/courses/${thumbnailFile.filename}`;
    }

    return await courseModel.createByInstructor(data);
  },

  async getCourseForEdit(proid, instructorId) {
    const course = await courseModel.findById(proid);
    if (!course) throw new Error('Course Not Found');
    if (course.instructor_id !== instructorId) throw new Error('Access Denied');
    return course;
  },

  async updateCourse(proid, instructorId, courseData, thumbnailFile) {
    const data = {
      proname: courseData.proname,
      tinydes: courseData.tinydes,
      fulldes: courseData.fulldes,
      catid: parseInt(courseData.catid),
      price: parseFloat(courseData.price),
      promo_price: courseData.promo_price ? parseFloat(courseData.promo_price) : null,
    };

    if (thumbnailFile) {
      data.thumbnail = `/static/uploads/courses/${thumbnailFile.filename}`;
    }

    return await courseModel.updateByInstructor(proid, instructorId, data);
  },

  async deleteCourse(proid, instructorId) {
    return await courseModel.deleteByInstructor(proid, instructorId);
  },

  async getCourseLessons(proid, instructorId) {
    const course = await courseModel.findById(proid);
    if (!course) throw new Error('Course Not Found');
    if (course.instructor_id !== instructorId) throw new Error('Access Denied');

    const lessons = await lessonModel.getByCourse(proid);
    return { course, lessons };
  },

  async createLesson(proid, instructorId, lessonData) {
    const course = await courseModel.findById(proid);
    if (!course || course.instructor_id !== instructorId) {
      throw new Error('Access denied');
    }

    const existingLessons = await lessonModel.getByCourse(proid);
    const order_index = existingLessons.length;

    const data = {
      proid,
      title: lessonData.title,
      description: lessonData.description || null,
      video_url: lessonData.video_url || null,
      duration: lessonData.duration || 0,
      order_index,
      is_preview: lessonData.is_preview || false,
    };

    return await lessonModel.create(data);
  },

  async getLessonForAPI(lessonId, instructorId) {
    const lesson = await lessonModel.findById(lessonId);
    if (!lesson) throw new Error('Lesson not found');

    const course = await courseModel.findById(lesson.proid);
    if (!course || course.instructor_id !== instructorId) {
      throw new Error('Access denied');
    }

    return lesson;
  },

  async updateLesson(lessonId, instructorId, lessonData) {
    const lesson = await lessonModel.findById(lessonId);
    if (!lesson) throw new Error('Lesson not found');

    const course = await courseModel.findById(lesson.proid);
    if (!course || course.instructor_id !== instructorId) {
      throw new Error('Access denied');
    }

    const data = {
      title: lessonData.title,
      description: lessonData.description || null,
      video_url: lessonData.video_url || null,
      duration: lessonData.duration || 0,
      is_preview: lessonData.is_preview || false,
    };

    return await lessonModel.update(lessonId, data);
  },

  async deleteLesson(lessonId, instructorId) {
    const lesson = await lessonModel.findById(lessonId);
    if (!lesson) throw new Error('Lesson not found');

    const course = await courseModel.findById(lesson.proid);
    if (!course || course.instructor_id !== instructorId) {
      throw new Error('Access denied');
    }

    return await lessonModel.delete(lessonId);
  },

  async reorderLessons(proid, instructorId, lessonOrders) {
    const course = await courseModel.findById(proid);
    if (!course || course.instructor_id !== instructorId) {
      throw new Error('Access denied');
    }

    return await lessonModel.reorder(proid, lessonOrders);
  },

  async verifyVideoUploadAccess(proid, instructorId) {
    const course = await courseModel.findById(proid);
    if (!course || course.instructor_id !== instructorId) {
      throw new Error('Access denied');
    }
    return true;
  },

  async toggleCourseCompletion(proid, instructorId, is_completed) {
    const course = await courseModel.findById(proid);
    if (!course || course.instructor_id !== instructorId) {
      throw new Error('Access denied');
    }
    return await courseModel.updateCompletionStatus(proid, is_completed);
  },
};
