import express from 'express';
import { engine } from 'express-handlebars';
import session from 'express-session';
import categoryModel from './models/category.model.js'; 
import path from 'path'; 

const __dirname = import.meta.dirname;
const app = express();


app.set('trust proxy', 1);
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(express.json({ limit: '10kb' }));
app.use('/static', express.static('static'));
app.use(session({
    secret: 'dominhkhoa2708', 
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));


app.engine('handlebars', engine({
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views/layouts'),
    helpers: {
        //section: sections(), 
        formatNumber(value) {
            return new Intl.NumberFormat('en-US').format(value);
        },
        eq(a, b) { return a === b; },
        gt(a, b) { return a > b; },
        lt(a, b) { return a < b; },
        sub(a, b) { return a - b; },
        add(a, b) { return a + b; },
        range(start, end) {
            const result = [];
            for (let i = start; i <= end; i++) { result.push(i); }
            return result;
        }
    }
}));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));


app.use(function(req, res, next) {
    res.locals.isAuthenticated = req.session.isAuthenticated || false;
    res.locals.authUser = req.session.authUser || null;
    next();
});

app.use(async function(req, res, next) {
    try {
        const list = await categoryModel.findAll(); 
        res.locals.global_categories = list; 
        res.locals.current_category = { id: req.query.id ? parseInt(req.query.id) : null }; 
    } catch (err) {
        console.error("Error loading global categories:", err.message);
        res.locals.global_categories = []; 
    }
    next();
});


//import accountRouter from './routes/account.route.js';
//import categoryRouter from './routes/category.route.js';
//import productRouter from './routes/product.route.js';

//app.use('/account', accountRouter);
//app.use('/admin/category', categoryRouter);
//app.use('/products', productRouter);


app.get('/', function(req, res) {
    res.render('index', { title: 'Online Academy' });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
    console.log(`Server is running at http://localhost:${PORT}`);
});