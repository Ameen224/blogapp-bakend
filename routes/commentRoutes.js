// routes/commentRoutes.js

const express = require('express');
const router = express.Router();

const commentController = require('../controllers/commentController');
const { authMiddleware } = require('../middlewares/authMiddleware');

// Add a comment
router.post('/:postId', authMiddleware, commentController.addComment);

// Delete a comment
router.delete('/:id', authMiddleware, commentController.deleteComment);

// Get all comments for a post
router.get('/post/:postId', commentController.getCommentsForPost);

module.exports = router;
