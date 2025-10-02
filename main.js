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
// Make sure you have created this file:
// import productRouter from './routes/product.route.js'; 
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
    section: sections(), // ✨ Register the section helper
    formatNumber(value) {
      if (typeof value === 'number') {
        return new Intl.NumberFormat('en-US').format(value);
      }
      return value;
    },
    // Add other helpers if needed
    eq: (a, b) => a === b,
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
//app.use('/products', productRouter);
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
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});