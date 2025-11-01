import express from 'express';
import { engine } from 'express-handlebars';
import session from 'express-session';
import path from 'path';
import sections from 'express-handlebars-sections'; 
import moment from 'moment';
// --- Model Imports ---
import categoryModel from './models/category.model.js';
import courseModel from './models/course.model.js';

// --- Route Imports ---
import accountRouter from './routes/account.route.js';
import productRouter from './routes/product.route.js'; 
import studentRouter from './routes/student.route.js';
import instructorRouter from './routes/instructor.route.js';
import adminRouter from './routes/admin.route.js';
import uploadRouter from './routes/upload.route.js';

const __dirname = import.meta.dirname;
const app = express();

// --- Middleware Setup ---
app.set('trust proxy', 1);
app.use(express.urlencoded({ extended: true, limit: '990mb' })); 
app.use(express.json({ limit: '110mb' }));
app.use('/static', express.static('static', {
  maxAge: '1d', // Cache static files for 1 day
  setHeaders: (res, path) => {
    // Set proper MIME types for video files
    if (path.endsWith('.mp4')) {
      res.setHeader('Content-Type', 'video/mp4');
    } else if (path.endsWith('.webm')) {
      res.setHeader('Content-Type', 'video/webm');
    } else if (path.endsWith('.ogg')) {
      res.setHeader('Content-Type', 'video/ogg');
    } else if (path.endsWith('.mov')) {
      res.setHeader('Content-Type', 'video/quicktime');
    }
    // Enable range requests for video streaming
    res.setHeader('Accept-Ranges', 'bytes');
  }
}));
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } 
}));

app.engine('handlebars', engine({
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  partialsDir: path.join(__dirname, 'views/partials'),
  helpers: {
    section: sections(), 
    formatNumber(value) {
      if (typeof value === 'number') {
        return new Intl.NumberFormat('en-US').format(value);
      }
      return value;
    },
    stars(rating) {
      if (typeof rating !== 'number' || rating < 0) {
        rating = 0;
      }
      let html = '';
      const fullStars = Math.floor(rating);
      const halfStar = rating % 1 >= 0.5;
      const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

      for (let i = 0; i < fullStars; i++) {
        html += '<svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>';
      }
      if (halfStar) {
        html += '<svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 15.585l-4.326 2.275 1.07-4.823L2.98 8.72h4.816L9.049 3.927v11.658z" clip-rule="evenodd"></path></svg>';
      }
      for (let i = 0; i < emptyStars; i++) {
        html += '<svg class="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>';
      }
      return html;
    },
    json(context) {
      return JSON.stringify(context, null, 2);
    },
    or(a, b) {
      return a || b;
    },
    and(a, b) {
      return a && b;
    },
    gt(a, b) {
      return a > b;
    },
    lt(a, b) {
      return a < b;
    },
    add(a, b) {
      return a + b;
    },
    sub(a, b) {
      return a - b;
    },
    div(a, b) {
      return Math.floor(a / b);
    },
    mul(a, b) {
      return a * b;
    },
    eq: (a, b) => a === b,
    raw(options) {
      return options.fn();
    },
    prevArrow() {
      const svg = '<svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>';
      return new this.Handlebars.SafeString(svg);
    },
    nextArrow() {
      const svg = '<svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4-4a1 1 0 01-1.414 0z" clip-rule="evenodd" /></svg>';
      return new this.Handlebars.SafeString(svg);
    },
    substring(str, start, end) {
      if (!str) return '';
      return str.substring(start, end).toUpperCase();
    },
    percentage(original, promo) {
      if (!promo || promo >= original) return 0;
      return Math.round(((original - promo) / original) * 100);
    },
    buildQueryString: (params, newKey, newValue) => {
      const query = new URLSearchParams(params);
      query.set(newKey, newValue);
      return query.toString();
    },
    toFixed(value, decimals) {
        if (value === null || value === undefined) return '0.0';
        const num = parseFloat(value);
        if (isNaN(num)) return '0.0';
        return num.toFixed(decimals || 1);
    },
    formatDate (date, format) {
      if (!date) return '';
      return moment(date).format(format || 'YYYY-MM-DD');
    },
    contains(str, substring) {
      if (!str || !substring) return false;
      return String(str).includes(String(substring));
    },
    extractVideoId(url) {
      if (!url) return '';
      
      // YouTube patterns
      const youtubePatterns = [
        /(?:youtube\.com\/embed\/|youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
      ];
      
      for (const pattern of youtubePatterns) {
        const match = url.match(pattern);
        if (match) return match[1];
      }
      
      // Vimeo patterns
      const vimeoPattern = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/;
      const vimeoMatch = url.match(vimeoPattern);
      if (vimeoMatch) return vimeoMatch[1];
      
      return '';
    },
    replace: function (string, search, replacement) {
      if (typeof string !== 'string') {
        return '';
      }
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      const searchRegExp = new RegExp(escapedSearch, 'g');
      return string.replace(searchRegExp, replacement);
    },
    // Add other helpers if needed
    
  }
}));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// --- Global Middleware for Views ---
// Makes authentication status available in all views
app.use(function(req, res, next) {
  res.locals.isAuthenticated = req.session.isAuthenticated || false;
  res.locals.authUser = req.session.authUser || null;
  next();
});

// Makes hierarchical categories available in all views
app.use(async function(req, res, next) {
  try {
    const categories = await categoryModel.getHierarchicalMenu();
    res.locals.global_categories = categories;
  } catch (err) {
    console.error("Error loading global categories:", err.message);
    res.locals.global_categories = [];
  }
  next();
});

// --- API endpoint for search suggestions ---
app.get('/api/search-suggestions', async function(req, res) {
  try {
    const query = req.query.q || '';
    
    if (query.trim().length < 2) {
      return res.json([]);
    }

    const suggestions = await courseModel.searchSuggestions(query, 5);
    res.json(suggestions);
  } catch (error) {
    console.error('Search suggestions error:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

// --- Route Registration ---
app.use('/account', accountRouter);
app.use('/products', productRouter);
app.use('/student', studentRouter);
app.use('/instructor', instructorRouter);
app.use('/admin', adminRouter);
app.use('/upload', uploadRouter);

// --- Homepage Route ---
app.get('/', async function(req, res) {
  try {
    const [topViewed, newest, popularTopics] = await Promise.all([
      courseModel.findTopViewed(),
      courseModel.findTopNewest(),
      categoryModel.findTopRegistered()
    ]);

    const featured = topViewed.slice(0, 4);

    res.render('index', {
      title: 'Online Academy',
      topViewed,
      newest,
      featured,
      popularTopics
    });
  } catch (error) {
    console.error("Error rendering homepage:", error);
    res.status(500).send("An error occurred while loading the homepage.");
  }
});

app.use(function(req, res) {
  res.status(404).render('error', { layout: false, error: { status: 404, message: 'Not Found' } });
});

app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.status(500).render('error', { layout: false, error: { status: 500, message: 'Internal Server Error' } });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
  console.log(`Server is running at http://localhost:${PORT}`);
});