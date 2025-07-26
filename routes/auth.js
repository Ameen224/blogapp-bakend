// routes/auth.js

const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
require('../config/passport');
require('dotenv').config();

const router = express.Router();

//  Helper: Generate JWT tokens
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

//  Google OAuth Routes

// Initiate Google OAuth
router.get('/google', (req, res, next) => {
  console.log('Google auth route hit');
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

// Google OAuth Callback
router.get(
  '/google/callback',
  (req, res, next) => {
    console.log('Google callback route hit');
    passport.authenticate('google', {
      session: false,
      failureRedirect: `${process.env.FRONTEND_URL}?error=auth_failed`,
    })(req, res, next);
  },
  async (req, res) => {
    try {
      if (!req.user) {
        console.error('No user found in request');
        return res.redirect(`${process.env.FRONTEND_URL}?error=no_user`);
      }

      const user = req.user;
      const tokens = generateTokens(user);

      // Set secure cookie for refresh token
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Prepare data to send to frontend
      const userData = encodeURIComponent(
        JSON.stringify({
          accessToken: tokens.accessToken,
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            category: user.category,
            role: user.role,
          },
        })
      );

      console.log('Redirecting to frontend with success');
      res.redirect(`${process.env.FRONTEND_URL}/auth/success?data=${userData}`);
    } catch (err) {
      console.error('Error in Google callback:', err);
      res.redirect(`${process.env.FRONTEND_URL}?error=server_error`);
    }
  }
);

//  Refresh Token Endpoint
router.get('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: 'No refresh token provided' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(403).json({ message: 'User not found' });
    }

    const tokens = generateTokens(user);

    // Update refresh token cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      accessToken: tokens.accessToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        category: user.category,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Error in refresh token:', err);
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    res.status(403).json({ message: 'Invalid or expired refresh token' });
  }
});

module.exports = router;
