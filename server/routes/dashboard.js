const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
    try {
        const [
            [bookRows],
            [availableRows],
            [authorRows],
            [categoryRows],
            [recentRows],
        ] = await Promise.all([
            pool.query('SELECT COUNT(*) AS n FROM books'),
            pool.query("SELECT COUNT(*) AS n FROM books WHERE availability = 'Available'"),
            pool.query('SELECT COUNT(*) AS n FROM authors'),
            pool.query('SELECT COUNT(*) AS n FROM categories'),
            pool.query(`
                SELECT b.id, b.title, b.isbn, b.availability,
                       a.full_name AS authorName, c.name AS categoryName
                FROM books b
                JOIN authors a ON a.id = b.author_id
                JOIN categories c ON c.id = b.category_id
                ORDER BY b.id DESC
                LIMIT 5
            `),
        ]);

        res.json({
            stats: {
                books: Number(bookRows[0].n),
                available: Number(availableRows[0].n),
                authors: Number(authorRows[0].n),
                categories: Number(categoryRows[0].n),
            },
            recentBooks: recentRows,
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
