// Express server: serves the frontend from the project root and the REST API.
// Run with: npm start   (or npm run dev for auto-reload)

const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const session = require('express-session');

const pool = require('./db');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const bookRoutes = require('./routes/books');
const authorRoutes = require('./routes/authors');
const categoryRoutes = require('./routes/categories');
const userRoutes = require('./routes/users');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ROOT = path.join(__dirname, '..');

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

app.use(session({
    name: 'booklib.sid',
    secret: process.env.SESSION_SECRET || 'booklib-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        maxAge: 8 * 60 * 60 * 1000, // 8 hours
    },
}));

// --- API ------------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/authors', authorRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', userRoutes);

app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

// --- Frontend (same project directory) ------------------------------------
app.get(['/', '/index.html'], (req, res) => {
    res.sendFile(path.join(ROOT, 'index.html'));
});
app.use('/css', express.static(path.join(ROOT, 'css')));
app.use('/js', express.static(path.join(ROOT, 'js')));

// --- Error handling -------------------------------------------------------
app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    console.error(err);
    const status = Number(err.status) >= 400 && Number(err.status) < 600 ? Number(err.status) : 500;
    const message = status === 500 ? 'Internal server error' : err.message;
    res.status(status).json({ error: message });
});

async function start() {
    try {
        await pool.query('SELECT 1');
    } catch (err) {
        console.error('\nCannot connect to MySQL.');
        console.error(err.message);
        console.error('\n1. Open the XAMPP Control Panel and start MySQL.');
        console.error('2. Check DB_HOST / DB_PORT / DB_USER / DB_PASSWORD in .env.');
        console.error('3. Run "npm run db:init" to create the database if you have not yet.');
        process.exit(1);
    }

    const server = app.listen(PORT, () => {
        console.log(`Book Library running at http://localhost:${PORT}`);
        console.log('Make sure MySQL is running in XAMPP.');
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`\nPort ${PORT} is already in use.`);
            console.error('Stop the other server, or set a different PORT in .env and try again.');
            process.exit(1);
        }
        throw err;
    });
}

start();
