/**
 * Authentication middleware for MarginMap
 */

export function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }

  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  res.redirect('/login.html');
}

export function attachUser(req, res, next) {
  if (req.session && req.session.userId) {
    req.user = {
      id: req.session.userId,
      email: req.session.userEmail,
      role: req.session.userRole
    };
  }
  next();
}
