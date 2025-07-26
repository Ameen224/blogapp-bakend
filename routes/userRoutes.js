// routes/userRoutes.js

const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const { authMiddleware, sessionAuth } = require('../middlewares/authMiddleware');

// OTP auth (session-based)
router.post('/send-otp', sessionAuth, userController.sendOtp);
router.post('/verify-otp', sessionAuth, userController.verifyOtp);

// Refresh access token
router.get('/refresh', userController.refreshToken);

// Authenticated user routes
router.get('/me', authMiddleware, userController.getCurrentUser);
router.put('/profile', authMiddleware, userController.updateProfile);
router.post('/logout', authMiddleware, userController.logout);

module.exports = router;
