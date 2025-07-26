//controllers/userController.js

const User = require("../models/User")
const Category = require("../models/Category")
const sendOtpEmail = require("../utils/sendOtpEmail")
const jwt = require("jsonwebtoken")
const axios = require("axios")
const { validationResult } = require("express-validator")

// Generate tokens
const generateTokens = (user) => {
  const accessToken = jwt.sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  })
  const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" })
  return { accessToken, refreshToken }
}

// Send OTP with session storage
exports.sendOtp = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Validation failed", errors: errors.array() })
    }
    const { email, captcha } = req.body

    // Verify reCAPTCHA
    const captchaVerifyUrl = `https://www.google.com/recaptcha/api/siteverify`
    const { data } = await axios.post(captchaVerifyUrl, null, {
      params: {
        secret: process.env.RECAPTCHA_SECRET_KEY,
        response: captcha,
      },
    })

    if (!data.success) {
      return res.status(400).json({
        message: "Captcha verification failed",
        captchaError: true,
      })
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const otpExpires = Date.now() + 5 * 60 * 1000 // 5 minutes

    // Store OTP in session instead of database
    req.session.otp = {
      code: otp,
      email: email,
      expires: otpExpires,
    }

    // Find or create user
    let user = await User.findOne({ email })
    if (!user) {
      user = await User.create({ email, name: email.split("@")[0] }) // Default name from email
    }

    // Send OTP email
    await sendOtpEmail(email, otp)

    res.json({
      message: "OTP sent successfully",
      email: email,
    })
  } catch (error) {
    console.error("Error in sendOtp:", error)
    res.status(500).json({
      message: "Failed to send OTP",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// Verify OTP from session
exports.verifyOtp = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Validation failed", errors: errors.array() })
    }
    const { email, otp } = req.body

    // Check session OTP
    const sessionOtp = req.session.otp
    if (!sessionOtp) {
      return res.status(400).json({
        message: "No OTP found. Please request a new one.",
        otpExpired: true,
      })
    }

    if (sessionOtp.email !== email || sessionOtp.code !== otp) {
      return res.status(400).json({
        message: "Invalid OTP or email",
        invalidOtp: true,
      })
    }

    if (Date.now() > sessionOtp.expires) {
      delete req.session.otp
      return res.status(400).json({
        message: "OTP has expired",
        otpExpired: true,
      })
    }

    // Find user
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Clear OTP from session
    delete req.session.otp

    // Update last login
    await user.updateLastLogin()

    // Generate tokens
    const tokens = generateTokens(user)

    // Set refresh token cookie
    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })

    res.json({
      message: "Login successful",
      accessToken: tokens.accessToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        categories: user.categories,
        role: user.role,
        lastLogin: user.lastLogin,
      },
    })
  } catch (error) {
    console.error("Error in verifyOtp:", error)
    res.status(500).json({
      message: "OTP verification failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// Refresh token
exports.refreshToken = async (req, res) => {
  try {
    const token = req.cookies.refreshToken
    if (!token) {
      return res.status(401).json({
        message: "No refresh token provided",
        tokenMissing: true,
      })
    }

    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET)
    const user = await User.findById(payload.id)

    if (!user || !user.isActive) {
      return res.status(403).json({
        message: "User not found or inactive",
        userNotFound: true,
      })
    }

    const accessToken = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    )

    res.json({
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        categories: user.categories,
        role: user.role,
        lastLogin: user.lastLogin,
      },
    })
  } catch (error) {
    console.error("Error in refreshToken:", error)
    // Clear invalid cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    })

    res.status(403).json({
      message: "Invalid or expired refresh token",
      tokenInvalid: true,
    })
  }
}

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Validation failed", errors: errors.array() })
    }
    const { name, categories } = req.body

    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Update user profile
    user.name = name
    // Ensure categories exist before assigning
    if (Array.isArray(categories)) {
      const existingCategories = await Category.find({ name: { $in: categories } }).select("name")
      const validCategoryNames = existingCategories.map((cat) => cat.name)
      user.categories = validCategoryNames
    }
    await user.save()

    res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        categories: user.categories,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Error in updateProfile:", error)
    res.status(500).json({
      message: "Failed to update profile",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// Logout user
exports.logout = async (req, res) => {
  try {
    // Clear refresh token cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    })
    // Destroy session
    req.session.destroy((err) => {
      if (err) {
        console.error("Session destruction failed:", err)
      }
    })

    res.json({ message: "Logged out successfully" })
  } catch (error) {
    console.error("Error in logout:", error)
    res
      .status(500)
      .json({ message: "Logout failed", error: process.env.NODE_ENV === "development" ? error.message : undefined })
  }
}

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -refreshToken") // Exclude sensitive fields
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }
    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        categories: user.categories,
        role: user.role,
        lastLogin: user.lastLogin,
        // profile: user.profile // If you have a separate profile field
      },
    })
  } catch (error) {
    console.error("Error in getCurrentUser:", error)
    res.status(500).json({
      message: "Failed to get user",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// Get available categories (for users to select)
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .select("name displayName description color icon")
      .sort({ displayName: 1 })
    res.json({
      categories,
      total: categories.length,
    })
  } catch (error) {
    console.error("Error in getCategories:", error)
    res.status(500).json({
      message: "Failed to get categories",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}
