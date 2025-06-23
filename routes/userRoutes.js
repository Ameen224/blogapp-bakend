// READFLOW-BAKEND/routes/userRoutes.js


const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.post('/send-otp', userController.sendOtp);
router.post('/verify-otp', userController.verifyOtp);
router.get('/refresh', userController.refreshToken);

router.post('/profile', authMiddleware, userController.updateProfile);
router.post('/logout', userController.logout);




module.exports = router;
