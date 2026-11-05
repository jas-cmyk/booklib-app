function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ error: 'You need to log in first.' });
    }
    next();
}

function requireAdmin(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ error: 'You need to log in first.' });
    }
    if (req.session.user.role !== 'Administrator') {
        return res.status(403).json({ error: 'Only administrators can manage users.' });
    }
    next();
}

module.exports = { requireAuth, requireAdmin };
