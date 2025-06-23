// READFLOW-BAKEND/middlewares/authMiddleware.js

const jwt = require('jsonwebtoken');

exports.authMiddleware = (req, res, next) => {
      try {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token missing' });

    const user = jwt.verify(token, process.env.JWT);
    req.user = user;
    next();
  } catch {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

exports.adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access only' });
  }
  next();
};
