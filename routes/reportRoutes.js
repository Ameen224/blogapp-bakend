// routes/reportRoutes.js

const express = require('express');
const router = express.Router();

const reportController = require('../controllers/reportController');
const { authMiddleware, adminAuthMiddleware } = require('../middlewares/authMiddleware');

// Submit a report
router.post('/', authMiddleware, reportController.createReport);

// Admin - get all reports
router.get('/', adminAuthMiddleware, reportController.getAllReports);

module.exports = router;
