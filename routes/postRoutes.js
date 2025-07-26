// routes/postRoutes.js

const express = require('express');
const router = express.Router();

const postController = require('../controllers/postController');
const { authMiddleware } = require('../middlewares/authMiddleware');

// Create a new post
router.post('/', authMiddleware, postController.createPost);

// Get all posts
router.get('/', postController.getPosts);

// Edit a post
router.put('/:id', authMiddleware, postController.editPost);

// Delete a post
router.delete('/:id', authMiddleware, postController.deletePost);

// Like/unlike a post
router.post('/:id/like', authMiddleware, postController.toggleLike);

// Search posts
router.get('/search', postController.searchPosts);

module.exports = router;
