// backend/middlewares/authMiddleware.js

// 1. Verify if the user is logged in
exports.requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Decode the mock Base64 token
    const decodedUser = JSON.parse(Buffer.from(token, 'base64').toString('ascii'));
    req.user = decodedUser;
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
  }
};

// 2. Role-Based Access Control (RBAC)
exports.requireRole = (allowedRoles) => {
  return (req, res, next) => {
    // Ensure requireAuth ran first and populated req.user
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: `Forbidden: Requires one of the following roles: ${allowedRoles.join(', ')}` 
      });
    }
    next();
  };
};