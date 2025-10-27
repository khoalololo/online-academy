# 🗄 Database Schema (PostgreSQL / Supabase)

## Table: `categories`

| Column | Type |
|--------|------|
| id | integer |
| name | character varying |
| parent_id | integer |

**Relations:**
- `categories.parent_id` → `categories.id`

## Table: `courses`

| Column | Type |
|--------|------|
| proid | integer |
| catid | integer |
| instructor_id | integer |
| proname | character varying |
| tinydes | character varying |
| fulldes | text |
| price | numeric |
| promo_price | numeric |
| is_completed | boolean |
| views | integer |
| last_updated | timestamp with time zone |
| fts | tsvector |
| is_disabled | boolean |
| thumbnail | character varying |

**Relations:**
- `courses.catid` → `categories.id`
- `courses.instructor_id` → `users.id`

## Table: `enrollment`

| Column | Type |
|--------|------|
| user_id | integer |
| proid | integer |
| enroll_date | timestamp with time zone |
| is_completed | boolean |

**Relations:**
- `enrollment.user_id` → `users.id`

## Table: `lesson_progress`

| Column | Type |
|--------|------|
| id | integer |
| user_id | integer |
| lesson_id | integer |
| is_completed | boolean |
| last_watched_position | integer |
| completed_at | timestamp with time zone |
| created_at | timestamp with time zone |
| updated_at | timestamp with time zone |

**Relations:**
- `lesson_progress.lesson_id` → `lessons.id`
- `lesson_progress.user_id` → `users.id`

## Table: `lessons`

| Column | Type |
|--------|------|
| id | integer |
| proid | integer |
| title | character varying |
| description | text |
| video_url | character varying |
| duration | integer |
| order_index | integer |
| is_preview | boolean |
| created_at | timestamp with time zone |

**Relations:**
- `lessons.proid` → `courses.proid`

## Table: `reviews`

| Column | Type |
|--------|------|
| id | integer |
| user_id | integer |
| proid | integer |
| rating | integer |
| comment | text |
| created_at | timestamp with time zone |
| updated_at | timestamp with time zone |

**Relations:**
- `reviews.proid` → `courses.proid`
- `reviews.user_id` → `users.id`

## Table: `users`

| Column | Type |
|--------|------|
| id | integer |
| username | character varying |
| password_hash | character varying |
| name | character varying |
| email | character varying |
| dob | date |
| permission_level | integer |
| created_at | timestamp with time zone |
| is_verified | boolean |
| otp_code | character varying |
| otp_expires_at | timestamp without time zone |
| bio | text |
| avatar | character varying |

## Table: `watchlist`

| Column | Type |
|--------|------|
| user_id | integer |
| proid | integer |

**Relations:**
- `watchlist.user_id` → `users.id`

