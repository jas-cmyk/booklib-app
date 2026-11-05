const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');

const router = express.Router();

router.post('/login', async (req, res, next) => {
    try {
        const username = String((req.body && req.body.username) || '').trim();
        const password = String((req.body && req.body.password) || '');

        if (!username || !password) {
            return res.status(400).json({ error: 'Please enter username and password' });
        }

        const [rows] = await pool.query(
            'SELECT id, username, full_name, role, password_hash FROM users WHERE username = ?',
            [username]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const user = rows[0];
        const passwordOk = await bcrypt.compare(password, user.password_hash);
        if (!passwordOk) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        req.session.user = {
            id: user.id,
            username: user.username,
            fullName: user.full_name,
            role: user.role,
        };

        return res.json(req.session.user);
    } catch (err) {
        next(err);
    }
});

router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Could not log out. Please try again.' });
        }
        res.clearCookie('booklib.sid');
        return res.json({ ok: true });
    });
});

router.get('/me', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    return res.json(req.session.user);
});

module.exports = router;
