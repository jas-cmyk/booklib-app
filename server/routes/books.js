const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const BOOK_SELECT = `
    SELECT b.id, b.title, b.isbn, b.author_id AS authorId, b.category_id AS categoryId,
           b.year, b.quantity, b.availability,
           a.full_name AS authorName, c.name AS categoryName
    FROM books b
    JOIN authors a ON a.id = b.author_id
    JOIN categories c ON c.id = b.category_id
`;

const AVAILABILITY = ['Available', 'Unavailable', 'Reserved'];

function parseId(value) {
    const id = Number.parseInt(value, 10);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function validateBook(body) {
    const title = String((body && body.title) || '').trim();
    const isbn = String((body && body.isbn) || '').trim();
    const authorId = Number.parseInt(body && body.authorId, 10);
    const categoryId = Number.parseInt(body && body.categoryId, 10);
    const year = Number.parseInt(body && body.year, 10);
    const quantity = Number.parseInt(body && body.quantity, 10);
    const availability = String((body && body.availability) || '');

    if (!title || !isbn) {
        return { error: 'Please fill in all required fields' };
    }
    if (!Number.isInteger(authorId) || !Number.isInteger(categoryId) ||
        !Number.isInteger(year) || !Number.isInteger(quantity)) {
        return { error: 'Please fill in all required fields correctly' };
    }
    if (quantity < 0) {
        return { error: 'Quantity cannot be negative' };
    }
    if (year < 1000 || year > 2100) {
        return { error: 'Please enter a valid publication year' };
    }
    if (!AVAILABILITY.includes(availability)) {
        return { error: 'Invalid availability value' };
    }

    return { value: { title, isbn, authorId, categoryId, year, quantity, availability } };
}

function handleDatabaseError(err, res) {
    if (err && err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'A book with this ISBN already exists.' });
    }
    if (err && err.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({ error: 'The selected author or category does not exist.' });
    }
    throw err;
}

router.get('/', requireAuth, async (req, res, next) => {
    try {
        const [rows] = await pool.query(`${BOOK_SELECT} ORDER BY b.id`);
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

router.get('/:id', requireAuth, async (req, res, next) => {
    try {
        const id = parseId(req.params.id);
        if (!id) return res.status(400).json({ error: 'Invalid book id' });

        const [rows] = await pool.query(`${BOOK_SELECT} WHERE b.id = ?`, [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Book not found' });

        res.json(rows[0]);
    } catch (err) {
        next(err);
    }
});

router.post('/', requireAuth, async (req, res, next) => {
    try {
        const parsed = validateBook(req.body);
        if (parsed.error) return res.status(400).json({ error: parsed.error });

        const { title, isbn, authorId, categoryId, year, quantity, availability } = parsed.value;
        const [result] = await pool.query(
            `INSERT INTO books (title, isbn, author_id, category_id, year, quantity, availability)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [title, isbn, authorId, categoryId, year, quantity, availability]
        );

        const [rows] = await pool.query(`${BOOK_SELECT} WHERE b.id = ?`, [result.insertId]);
        res.status(201).json(rows[0]);
    } catch (err) {
        try {
            handleDatabaseError(err, res);
        } catch (unhandled) {
            next(unhandled);
        }
    }
});

router.put('/:id', requireAuth, async (req, res, next) => {
    try {
        const id = parseId(req.params.id);
        if (!id) return res.status(400).json({ error: 'Invalid book id' });

        const parsed = validateBook(req.body);
        if (parsed.error) return res.status(400).json({ error: parsed.error });

        const [existing] = await pool.query('SELECT id FROM books WHERE id = ?', [id]);
        if (existing.length === 0) return res.status(404).json({ error: 'Book not found' });

        const { title, isbn, authorId, categoryId, year, quantity, availability } = parsed.value;
        await pool.query(
            `UPDATE books
             SET title = ?, isbn = ?, author_id = ?, category_id = ?, year = ?, quantity = ?, availability = ?
             WHERE id = ?`,
            [title, isbn, authorId, categoryId, year, quantity, availability, id]
        );

        const [rows] = await pool.query(`${BOOK_SELECT} WHERE b.id = ?`, [id]);
        res.json(rows[0]);
    } catch (err) {
        try {
            handleDatabaseError(err, res);
        } catch (unhandled) {
            next(unhandled);
        }
    }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
    try {
        const id = parseId(req.params.id);
        if (!id) return res.status(400).json({ error: 'Invalid book id' });

        const [result] = await pool.query('DELETE FROM books WHERE id = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Book not found' });

        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
