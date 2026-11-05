const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

const ROLES = ['Administrator', 'User'];

function hashPassword(password) {
    return new Promise((resolve, reject) => {
        bcrypt.hash(password, 10, (err, hash) => (err ? reject(err) : resolve(hash)));
    });
}

function parseId(value) {
    const id = Number.parseInt(value, 10);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function publicUser(row) {
    return {
        id: row.id,
        username: row.username,
        fullName: row.full_name,
        role: row.role,
    };
}

async function adminCount() {
    const [[row]] = await pool.query("SELECT COUNT(*) AS n FROM users WHERE role = 'Administrator'");
    return Number(row.n);
}

router.get('/', requireAdmin, async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, username, full_name, role FROM users ORDER BY id'
        );
        res.json(rows.map(publicUser));
    } catch (err) {
        next(err);
    }
});

router.post('/', requireAdmin, async (req, res, next) => {
    try {
        const username = String((req.body && req.body.username) || '').trim();
        const fullName = String((req.body && req.body.fullName) || '').trim();
        const role = String((req.body && req.body.role) || '');
        const password = String((req.body && req.body.password) || '');

        if (!username || !fullName || !role || !password) {
            return res.status(400).json({ error: 'Please fill in all required fields' });
        }
        if (username.length < 3) {
            return res.status(400).json({ error: 'Username must be at least 3 characters.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }
        if (!ROLES.includes(role)) {
            return res.status(400).json({ error: 'Invalid role.' });
        }

        const passwordHash = await hashPassword(password);
        const [result] = await pool.query(
            'INSERT INTO users (username, full_name, role, password_hash) VALUES (?, ?, ?, ?)',
            [username, fullName, role, passwordHash]
        );

        res.status(201).json({ id: result.insertId, username, fullName, role });
    } catch (err) {
        if (err && err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Username already exists' });
        }
        next(err);
    }
});

router.put('/:id', requireAdmin, async (req, res, next) => {
    try {
        const id = parseId(req.params.id);
        if (!id) return res.status(400).json({ error: 'Invalid user id' });

        const username = String((req.body && req.body.username) || '').trim();
        const fullName = String((req.body && req.body.fullName) || '').trim();
        const role = String((req.body && req.body.role) || '');
        const password = String((req.body && req.body.password) || '');

        if (!username || !fullName || !role) {
            return res.status(400).json({ error: 'Please fill in all required fields' });
        }
        if (username.length < 3) {
            return res.status(400).json({ error: 'Username must be at least 3 characters.' });
        }
        if (!ROLES.includes(role)) {
            return res.status(400).json({ error: 'Invalid role.' });
        }
        if (password && password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }

        const [existingRows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
        if (existingRows.length === 0) return res.status(404).json({ error: 'User not found' });

        const existing = existingRows[0];

        // Never allow the final administrator to be demoted.
        if (existing.role === 'Administrator' && role !== 'Administrator') {
            if ((await adminCount()) <= 1) {
                return res.status(409).json({ error: 'You cannot remove the last administrator.' });
            }
        }

        if (password) {
            const passwordHash = await hashPassword(password);
            await pool.query(
                'UPDATE users SET username = ?, full_name = ?, role = ?, password_hash = ? WHERE id = ?',
                [username, fullName, role, passwordHash, id]
            );
        } else {
            await pool.query(
                'UPDATE users SET username = ?, full_name = ?, role = ? WHERE id = ?',
                [username, fullName, role, id]
            );
        }

        // Keep the current session in sync when an admin edits their own account.
        if (req.session.user.id === id) {
            req.session.user.username = username;
            req.session.user.fullName = fullName;
            req.session.user.role = role;
        }

        res.json({ id, username, fullName, role });
    } catch (err) {
        if (err && err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Username already exists' });
        }
        next(err);
    }
});

router.delete('/:id', requireAdmin, async (req, res, next) => {
    try {
        const id = parseId(req.params.id);
        if (!id) return res.status(400).json({ error: 'Invalid user id' });

        if (id === req.session.user.id) {
            return res.status(409).json({ error: 'Cannot delete your own account' });
        }

        const [existingRows] = await pool.query('SELECT role FROM users WHERE id = ?', [id]);
        if (existingRows.length === 0) return res.status(404).json({ error: 'User not found' });

        if (existingRows[0].role === 'Administrator' && (await adminCount()) <= 1) {
            return res.status(409).json({ error: 'You cannot delete the last administrator.' });
        }

        await pool.query('DELETE FROM users WHERE id = ?', [id]);
        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
