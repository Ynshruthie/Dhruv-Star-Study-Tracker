const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dhruv-star-academy-secret-key-2026';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  // Accept standard Bearer credentials regardless of extra whitespace or
  // header casing. Express lower-cases header names for us.
  const bearerMatch = typeof authHeader === 'string'
    ? authHeader.match(/^Bearer\s+(.+)$/i)
    : null;
  const token = bearerMatch?.[1]?.trim();

  if (!token) {
    return res.status(401).json({
      error: 'Access token required',
      code: 'AUTH_TOKEN_MISSING'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      // An invalid/expired credential is an authentication failure (401),
      // not an authorization failure (403). The client can consequently
      // discard an old saved session and return to login.
      return res.status(401).json({
        error: 'Your session has expired. Please sign in again.',
        code: 'AUTH_TOKEN_INVALID'
      });
    }
    req.user = user;
    next();
  });
};

const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: `Access denied. Requires ${role} role.` });
    }
    next();
  };
};

// Ensures student can only access/modify their own student_id
const enforceStudentScope = (req, res, next) => {
  if (req.user.role === 'teacher') {
    return next(); // Teacher can view/edit
  }

  const requestedStudentId = req.params.studentId || req.body.student_id || req.query.student_id;
  if (requestedStudentId && requestedStudentId !== req.user.student_id) {
    return res.status(403).json({ error: 'Unauthorized: You can only access your own student data.' });
  }
  next();
};

module.exports = {
  JWT_SECRET,
  authenticateToken,
  requireRole,
  enforceStudentScope
};
