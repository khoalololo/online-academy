# Online Academy - Final Project

A comprehensive online learning platform built with Node.js, Express, Handlebars, and PostgreSQL/Supabase.

---

## Project Overview

**Online Academy** is a full-featured e-learning platform that enables students to enroll in courses, instructors to create and manage courses, and administrators to oversee the entire system. The platform supports course creation, lesson management, progress tracking, reviews, and more.

### User Roles

* **Students**: Browse courses, enroll, track progress, write reviews, manage watchlist
* **Instructors**: Create courses, manage lessons, view statistics
* **Admins**: Full platform control, user management, course oversight

---

## Key Features

### Authentication & Authorization

* User registration with OTP email verification 
* Secure login with bcrypt password hashing
* Role-based access control (Student, Instructor, Admin)
* Profile management with avatar upload

### Course Management

* **Students**:

  * Browse and search courses with filters (category, sort, pagination)
  * Enroll in courses
  * Track learning progress
  * Add courses to watchlist
  * Write and edit reviews with star ratings
  * View course content with video player (YouTube/Vimeo support)
* **Instructors**:

  * Create and edit courses with rich text descriptions (TinyMCE)
  * Upload course thumbnails
  * Add/edit/delete lessons with video URLs
  * Reorder lessons via drag-and-drop
  * Mark courses as complete/incomplete
  * View course statistics (students, ratings, reviews)
* **Admins**:

  * Enable/disable courses
  * Delete courses (with cascade handling)
  * Create instructor accounts directly
  * Manage all users and permissions

### Dashboard & Analytics

* **Student Dashboard**: Enrolled courses with progress bars
* **Instructor Dashboard**: Course statistics, student count, ratings
* **Admin Dashboard**: Platform-wide statistics and recent activity

### Lesson Progress Tracking

* Mark lessons as complete/incomplete
* Track video watch position
* Calculate course completion percentage
* Visual progress indicators

### Review System

* 5-star rating system
* Written reviews with timestamps
* Rating distribution visualization
* Average rating calculation

### Search & Filtering

* Full-text search with PostgreSQL `tsvector`
* Filter by category and subcategory
* Sort by relevance, newest, rating, price, popularity
* Pagination with page numbers

### Category Management

* Hierarchical categories (parent/child)
* Admin category CRUD operations
* Dynamic category navigation

---

## Technology Stack

### Backend

* Node.js - Runtime environment
* Express.js 5.1 - Web framework
* Handlebars - Templating engine
* PostgreSQL (Supabase) - Database
* Knex.js - SQL query builder
* bcryptjs - Password hashing
* express-session - Session management
* Nodemailer - Email sending (OTP verification)

### Frontend

* Tailwind CSS - Utility-first CSS framework
* SweetAlert2 - Beautiful alerts
* Plyr - Video player
* TinyMCE - Rich text editor

### File Handling

* Multer - File upload middleware
* Image uploads for course thumbnails and user avatars

---

## Project Structure

```
online-academy/
├── models/
│   ├── admin.model.js
│   ├── category.model.js
│   ├── course.model.js
│   ├── enrollment.model.js
│   ├── lesson.model.js
│   ├── lesson-progress.model.js
│   ├── review.model.js
│   ├── user.model.js
│   └── watchlist.model.js
├── routes/
│   ├── account.route.js
│   ├── admin.route.js
│   ├── instructor.route.js
│   ├── product.route.js
│   ├── student.route.js
│   └── upload.route.js
├── middlewares/
│   └── auth.mdw.js
├── views/
│   ├── layouts/
│   ├── partials/
│   ├── vwAccount/
│   ├── vwAdmin/
│   ├── vwInstructor/
│   ├── vwProduct/
│   └── vwStudent/
├── static/
│   ├── images/
│   ├── scripts/
│   └── uploads/
├── ultis/
│   ├── db.js
│   └── emailService.js
├── main.js
├── package.json
└── README.md
```

---

## Installation & Setup

### Prerequisites

* Node.js (v18 or higher)
* PostgreSQL database (or Supabase account)
* npm or yarn

### 1. Clone the Repository

```bash
git clone https://github.com/khoalololo/online-academy
cd online-academy
```

### 2. Install Dependencies

```bash
npm install
```


### 3. Run the Application

```bash
npm run dev   # Development mode
npm start     # Production mode
```

App runs on `http://localhost:3000`.

---

## Demo Accounts

**Admin**

* Username: `admin 2`
* Password: `password123`

**Student**

* Username: `minh khoa`
* Password: `password123`

**Instructor**

* Username: `new instructor`
* Password: `password123`

---

## Database Schema

### Core Tables

* `users`
* `categories`
* `courses`
* `lessons`
* `enrollment`
* `lesson_progress`
* `reviews`
* `watchlist`

### Relationships

* Users ↔ Courses (instructor)
* Users ↔ Enrollment ↔ Courses
* Courses ↔ Lessons
* Courses ↔ Categories
* Users ↔ Reviews ↔ Courses
* Users ↔ Lesson Progress ↔ Lessons

See `DB_SCHEMA.md` for complete schema details.

---

## Features Breakdown

### Student

* Browse and search courses
* Enroll and track progress
* Watch course videos
* Add to watchlist
* Write reviews
* View progress dashboard

### Instructor

* Create and manage courses
* Upload thumbnails and lessons
* Manage lessons
* Reorder lessons
* View statistics

### Admin

* Manage users, courses, and categories
* Change user roles
* View platform statistics

### Common

* Responsive design
* Secure authentication
* Avatar upload
* SweetAlert2 integration
* Role-based access control

---

## Security Features

* Password hashing with bcrypt
* OTP verification
* Session-based authentication
* Role-based authorization middleware
* File validation for uploads

---

## Dependencies

### Production

```json
{
  "bcryptjs": "^2.4.3",
  "crypto": "^1.0.1",
  "express": "^5.1.0",
  "express-handlebars": "^8.0.1",
  "express-handlebars-sections": "^1.0.1",
  "express-session": "^1.18.2",
  "express-validator": "^7.2.1",
  "knex": "^3.1.0",
  "moment": "^2.30.1",
  "multer": "^2.0.2",
  "nodemailer": "^7.0.10",
  "pg": "^8.11.3"
}
```

### Development

```json
{
  "nodemon": "^3.1.10"
}
```
---


