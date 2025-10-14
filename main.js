import express from 'express';
import { engine } from 'express-handlebars';
import session from 'express-session';
import path from 'path';
import sections from 'express-handlebars-sections'; // For section helpers

// --- Model Imports ---
import categoryModel from './models/category.model.js';
import courseModel from './models/course.model.js';

// --- Route Imports ---
import accountRouter from './routes/account.route.js';
import productRouter from './routes/product.route.js'; 
// import adminRouter from './routes/admin.route.js'; // For future use

const __dirname = import.meta.dirname;
const app = express();

// --- Middleware Setup ---
app.set('trust proxy', 1);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/static', express.static('static'));
app.use(session({
  secret: 'your-secret-key', // Change this to a strong, random secret
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS in production
}));

// --- Handlebars View Engine Setup ---
app.engine('handlebars', engine({
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  partialsDir: path.join(__dirname, 'views/partials'),
  helpers: {
    section: sections(), // Register the section helper
    formatNumber(value) {
      if (typeof value === 'number') {
        return new Intl.NumberFormat('en-US').format(value);
      }
      return value;
    },
    // Add other helpers if needed
    eq: (a, b) => a === b,
    stars(rating) {
      let html = '';
        const roundedRating = Math.round(rating * 2) / 2; // Round to nearest 0.5
        for (let i = 1; i <= 5; i++) {
            if (i <= roundedRating) {
                html += '<svg class="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.955a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.446a1 1 0 00-.364 1.118l1.287 3.955c.3.921-.755 1.688-1.54 1.118l-3.368-2.446a1 1 0 00-1.176 0l-3.368 2.446c-.784.57-1.838-.197-1.54-1.118l1.287-3.955a1 1 0 00-.364-1.118L2.05 9.382c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.049 2.927z"></path></svg>';
            } else {
                html += '<svg class="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.955a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.446a1 1 0 00-.364 1.118l1.287 3.955c.3.921-.755 1.688-1.54 1.118l-3.368-2.446a1 1 0 00-1.176 0l-3.368 2.446c-.784.57-1.838-.197-1.54-1.118l1.287-3.955a1 1 0 00-.364-1.118L2.05 9.382c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.049 2.927z"></path></svg>';
            }
        }
        return html;
    }
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

// --- Route Registration ---
app.use('/account', accountRouter);
app.use('/products', productRouter);
// app.use('/admin', adminRouter); // For future use

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

// --- Error Handling ---
app.use(function(req, res) {
  res.status(404).render('404', { layout: false });
});

app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.status(500).render('500', { layout: false });
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
  console.log(`Server is running at http://localhost:${PORT}`);
});