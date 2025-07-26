// routes/categoryRoutes.js

const express = require('express');
const router = express.Router();

const categoryController = require('../controllers/userController');
const categoryControllerAdmin = require('../controllers/adminController');
const { adminAuthMiddleware } = require('../middlewares/authMiddleware');

// Public - get all categories
router.get('/', categoryController.getCategories);

// Admin - manage categories
router.post('/', adminAuthMiddleware, categoryControllerAdmin.createCategory);
router.put('/:id', adminAuthMiddleware, categoryControllerAdmin.updateCategory);
router.delete('/:id', adminAuthMiddleware, categoryControllerAdmin.deleteCategory);

module.exports = router;
