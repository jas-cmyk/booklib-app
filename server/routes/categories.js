const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function parseId(value) {
    const id = Number.parseInt(value, 10);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function validateCategory(body) {
    const name = String((body && body.name) || '').trim();
    const description = String((body && body.description) || '').trim();

    if (!name || !description) {
        return { error: 'Please fill in all required fields' };
    }

    return { value: { name, description } };
}

router.get('/', requireAuth, async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT id, name, description FROM categories ORDER BY id');
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

router.post('/', requireAuth, async (req, res, next) => {
    try {
        const parsed = validateCategory(req.body);
        if (parsed.error) return res.status(400).json({ error: parsed.error });

        const { name, description } = parsed.value;
        const [result] = await pool.query(
            'INSERT INTO categories (name, description) VALUES (?, ?)',
            [name, description]
        );

        res.status(201).json({ id: result.insertId, name, description });
    } catch (err) {
        if (err && err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'A category with this name already exists.' });
        }
        next(err);
    }
});

router.put('/:id', requireAuth, async (req, res, next) => {
    try {
        const id = parseId(req.params.id);
        if (!id) return res.status(400).json({ error: 'Invalid category id' });

        const parsed = validateCategory(req.body);
        if (parsed.error) return res.status(400).json({ error: parsed.error });

        const [existing] = await pool.query('SELECT id FROM categories WHERE id = ?', [id]);
        if (existing.length === 0) return res.status(404).json({ error: 'Category not found' });

        const { name, description } = parsed.value;
        await pool.query(
            'UPDATE categories SET name = ?, description = ? WHERE id = ?',
            [name, description, id]
        );

        res.json({ id, name, description });
    } catch (err) {
        if (err && err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'A category with this name already exists.' });
        }
        next(err);
    }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
    try {
        const id = parseId(req.params.id);
        if (!id) return res.status(400).json({ error: 'Invalid category id' });

        await pool.query('DELETE FROM categories WHERE id = ?', [id]);
        res.json({ ok: true });
    } catch (err) {
        if (err && err.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({
                error: 'Cannot delete this category because there are books associated with it.',
            });
        }
        next(err);
    }
});

module.exports = router;
