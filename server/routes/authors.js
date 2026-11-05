const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseId(value) {
    const id = Number.parseInt(value, 10);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function validateAuthor(body) {
    const fullName = String((body && body.fullName) || '').trim();
    const email = String((body && body.email) || '').trim();
    const country = String((body && body.country) || '').trim();

    if (!fullName || !email || !country) {
        return { error: 'Please fill in all required fields' };
    }
    if (!EMAIL_RE.test(email)) {
        return { error: 'Please enter a valid email address' };
    }

    return { value: { fullName, email, country } };
}

router.get('/', requireAuth, async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, full_name AS fullName, email, country FROM authors ORDER BY id'
        );
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

router.post('/', requireAuth, async (req, res, next) => {
    try {
        const parsed = validateAuthor(req.body);
        if (parsed.error) return res.status(400).json({ error: parsed.error });

        const { fullName, email, country } = parsed.value;
        const [result] = await pool.query(
            'INSERT INTO authors (full_name, email, country) VALUES (?, ?, ?)',
            [fullName, email, country]
        );

        res.status(201).json({ id: result.insertId, fullName, email, country });
    } catch (err) {
        next(err);
    }
});

router.put('/:id', requireAuth, async (req, res, next) => {
    try {
        const id = parseId(req.params.id);
        if (!id) return res.status(400).json({ error: 'Invalid author id' });

        const parsed = validateAuthor(req.body);
        if (parsed.error) return res.status(400).json({ error: parsed.error });

        const [existing] = await pool.query('SELECT id FROM authors WHERE id = ?', [id]);
        if (existing.length === 0) return res.status(404).json({ error: 'Author not found' });

        const { fullName, email, country } = parsed.value;
        await pool.query(
            'UPDATE authors SET full_name = ?, email = ?, country = ? WHERE id = ?',
            [fullName, email, country, id]
        );

        res.json({ id, fullName, email, country });
    } catch (err) {
        next(err);
    }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
    try {
        const id = parseId(req.params.id);
        if (!id) return res.status(400).json({ error: 'Invalid author id' });

        await pool.query('DELETE FROM authors WHERE id = ?', [id]);
        res.json({ ok: true });
    } catch (err) {
        if (err && err.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({
                error: 'Cannot delete this author because there are books associated with them.',
            });
        }
        next(err);
    }
});

module.exports = router;
