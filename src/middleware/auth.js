const jwt = require('jsonwebtoken');

module.exports = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    console.error('No token provided');
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    req.user = decoded;
    console.log('Authenticated user:', req.user.userId);
    next();
  } catch (error) {
    console.error('Token verification error:', {
      token,
      message: error.message,
      stack: error.stack,
    });
    res.status(401).json({ msg: 'Token is not valid' });
  }
};