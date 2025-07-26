// READFLOW-BAKEND/middlewares/authMiddleware.js

const jwt = require("jsonwebtoken")
const User = require("../models/User")

// Middleware to protect user routes
exports.authMiddleware = async (req, res, next) => {
  let token

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      // Get token from header
      token = req.headers.authorization.split(" ")[1]

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      // Attach user to the request
      req.user = await User.findById(decoded.id).select("-password -refreshToken")

      if (!req.user || !req.user.isActive) {
        return res.status(401).json({ message: "Not authorized, user inactive or not found" })
      }

      next()
    } catch (error) {
      console.error("Auth middleware error:", error)
      res.status(401).json({ message: "Not authorized, token failed" })
    }
  }

  if (!token) {
    res.status(401).json({ message: "Not authorized, no token" })
  }
}

// Middleware to protect admin routes
exports.adminAuthMiddleware = async (req, res, next) => {
  let token

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1]
      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      req.user = await User.findById(decoded.id).select("-password -refreshToken")

      if (!req.user || req.user.role !== "admin" || !req.user.isActive) {
        return res.status(403).json({ message: "Not authorized as an admin" })
      }

      next()
    } catch (error) {
      console.error("Admin auth middleware error:", error)
      res.status(401).json({ message: "Not authorized, token failed" })
    }
  }

  if (!token) {
    res.status(401).json({ message: "Not authorized, no token" })
  }
}

// Middleware for session-based authentication (e.g., for OTP flow)
exports.sessionAuth = (req, res, next) => {
  if (req.session) {
    next()
  } else {
    res.status(401).json({ message: "Session not found or expired. Please try again." })
  }
}

