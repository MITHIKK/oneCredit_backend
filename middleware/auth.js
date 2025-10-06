const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. Invalid token format.' 
      });
    }

    try {
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await User.findById(decoded.userId)
        .select('-password -passwordResetToken -passwordResetExpires -emailVerificationToken -emailVerificationExpires');
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Access denied. User not found.' 
        });
      }

      if (!user.isActive) {
        return res.status(401).json({ 
          success: false, 
          message: 'Access denied. Account is deactivated.' 
        });
      }

      if (user.isLocked) {
        return res.status(423).json({ 
          success: false, 
          message: 'Account is temporarily locked due to failed login attempts.' 
        });
      }

      req.user = user;
      req.userId = user._id;
      
      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false, 
          message: 'Access denied. Token has expired.' 
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          success: false, 
          message: 'Access denied. Invalid token.' 
        });
      } else {
        throw jwtError;
      }
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during authentication.' 
    });
  }
};

const requireEmailVerification = (req, res, next) => {
  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Email verification required. Please verify your email address.',
      requiresEmailVerification: true
    });
  }
  next();
};

const requirePermissions = (permissions) => {
  return (req, res, next) => {
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    next();
  };
};

const requireResourceOwnership = (resourceModel, resourceIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceIdParam];
      const resource = await resourceModel.findById(resourceId);

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found.'
        });
      }

      if (resource.user.toString() !== req.userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not have permission to access this resource.'
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      console.error('Resource ownership check error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during permission check.'
      });
    }
  };
};

const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req, res, next) => {
    const userId = req.userId ? req.userId.toString() : req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    if (requests.has(userId)) {
      const userRequests = requests.get(userId).filter(time => time > windowStart);
      requests.set(userId, userRequests);
    }

    const userRequests = requests.get(userId) || [];

    if (userRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    userRequests.push(now);
    requests.set(userId, userRequests);

    next();
  };
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return next(); 
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      return next(); 
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId)
        .select('-password -passwordResetToken -passwordResetExpires -emailVerificationToken -emailVerificationExpires');
      
      if (user && user.isActive && !user.isLocked) {
        req.user = user;
        req.userId = user._id;
      }
    } catch (jwtError) {
      
    }

    next();
  } catch (error) {
    console.error('Optional authentication error:', error);
    next(); 
  }
};

const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    const userRole = req.user.role || 'customer';
    
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

const logActivity = (action) => {
  return (req, res, next) => {
    
    if (req.user) {
      console.log(`User ${req.user.email} performed action: ${action}`, {
        userId: req.userId,
        action,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
    }
    next();
  };
};

module.exports = {
  authenticate,
  authorize,
  requireEmailVerification,
  requirePermissions,
  requireResourceOwnership,
  userRateLimit,
  optionalAuth,
  logActivity
};
