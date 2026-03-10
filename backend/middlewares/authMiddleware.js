const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      console.log("🔑 Received Token:", token);

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("✅ Decoded Token:", decoded);

      req.user = await User.findById(decoded.id).select('-password');
      console.log("👤 Attached User:", req.user);

      next();
    } catch (error) {
      console.error("❌ Token verification failed:", error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    console.warn("⚠️ No token found in headers");
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = { protect };
