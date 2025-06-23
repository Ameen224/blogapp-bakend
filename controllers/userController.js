// READFLOW-BAKEND/controllers/userController.js
const User = require('../models/User');
const sendOtpEmail = require('../utils/sendOtpEmail');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();


// Generate access and refresh tokens
function generateTokens(user) {
  const accessToken = jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT,
    { expiresIn: '15m' }
  );
  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH, // ✅ fixed
    { expiresIn: '7d' }
  );
  return { accessToken, refreshToken };
}

// Send OTP to email after captcha verification
exports.sendOtp = async (req, res) => {
  const { email, captcha } = req.body;

  try {
    // Verify reCAPTCHA
    const captchaVerifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.reCAPTCHA}&response=${captcha}`;
    const { data } = await axios.post(captchaVerifyUrl);

    if (!data.success) {
      return res.status(400).json({ message: 'Captcha verification failed' });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Find or create user
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ email });
    }

    

    await sendOtpEmail(email, otp);
    res.json({ message: 'OTP sent' });

  } catch (err) {
    console.error('Error in sendOtp:', err.message);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
};

// Verify OTP and login
exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email });

    // If you're saving OTP in DB, validate here
    // if (!user || user.otp !== otp || Date.now() > user.otpExpires)

    if (!user) {
      return res.status(400).json({ message: 'Invalid OTP or user not found' });
    }

    // Clear OTP fields
    // user.otp = null;
    // user.otpExpires = null;

    const tokens = generateTokens(user);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: false, // Set to true in production (with HTTPS)
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      accessToken: tokens.accessToken,
      user: { id: user._id, email: user.email, role: user.role }
    });

  } catch (err) {
    console.error('Error in verifyOtp:', err.message);
    res.status(500).json({ message: 'OTP verification failed' });
  }
};

// Refresh access token using refresh token
exports.refreshToken = async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.sendStatus(401);

  try {
    const payload = jwt.verify(token, process.env.JWT_REFRESH);
    const user = await User.findById(payload.id);

    if (!user || user.refreshToken !== token) {
      return res.sendStatus(403);
    }

    const accessToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT,
      { expiresIn: '15m' }
    );

    res.json({ accessToken });

  } catch (err) {
    console.error('Error in refreshToken:', err.message);
    res.sendStatus(403);
  }
};

// Update name and categories (multiple)
exports.updateProfile = async (req, res) => {
  const { name, category } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.name = name;
    user.category = category; // Should be array of ObjectIds
    await user.save();

    res.json({ message: 'Profile updated' });

  } catch (err) {
    console.error('Error in updateProfile:', err.message);
    res.status(500).json({ message: 'Failed to update profile' });
  }
};

// Logout user and clear refresh token
exports.logout = async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(204).end(); // No content

  try {
    const user = await User.findOne({ refreshToken: token });

    if (user) {
      user.refreshToken = null;
      await user.save();
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
    });

    res.json({ message: 'Logged out' });

  } catch (err) {
    console.error('Error in logout:', err.message);
    res.status(500).json({ message: 'Logout failed' });
  }
};
