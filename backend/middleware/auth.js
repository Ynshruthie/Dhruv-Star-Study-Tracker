const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dhruv-star-academy-secret-key-2026';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
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
