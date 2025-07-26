// controllers/commentController.js

const Comment = require("../models/Comment")
const Post = require("../models/Post") // Assuming Post model might be needed for context or validation

// Add a comment to a post
exports.addComment = async (req, res) => {
  try {
    const { postId } = req.params
    const { content } = req.body

    // Optional: Check if post exists
    const post = await Post.findById(postId)
    if (!post) {
      return res.status(404).json({ message: "Post not found" })
    }

    const comment = await Comment.create({ content, author: req.user.id, post: postId })
    res.status(201).json({ message: "Comment added", comment })
  } catch (error) {
    res.status(500).json({ message: "Failed to add comment", error: error.message })
  }
}

// Delete a comment
exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.params
    // Allow deletion only by the author of the comment or an admin (if adminAuthMiddleware is used)
    const comment = await Comment.findOneAndDelete({ _id: id, author: req.user.id })
    if (!comment) return res.status(404).json({ message: "Comment not found or unauthorized" })
    res.json({ message: "Comment deleted" })
  } catch (error) {
    res.status(500).json({ message: "Failed to delete comment", error: error.message })
  }
}

// Get comments for a post
exports.getCommentsForPost = async (req, res) => {
  try {
    const { postId } = req.params
    const comments = await Comment.find({ post: postId })
      .populate("author", "name email") // Populate author details
      .sort({ createdAt: 1 }) // Sort by creation date ascending

    res.json({ comments })
  } catch (error) {
    res.status(500).json({ message: "Failed to get comments", error: error.message })
  }
}
