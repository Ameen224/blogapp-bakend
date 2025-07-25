// READFLOW-BAKEND/routes/adminRoutes.js


const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');

router.get('/dashboard', authMiddleware, adminMiddleware, adminController.getDashboardData);

module.exports = router;
