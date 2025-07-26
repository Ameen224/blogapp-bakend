// controllers/postController.js

const Post = require("../models/Post")
const User = require("../models/User") // Assuming User model might be needed for validation or population

// Create a new post
exports.createPost = async (req, res) => {
  try {
    const { title, content, categories } = req.body
    const post = await Post.create({ title, content, categories, author: req.user.id })
    res.status(201).json({ message: "Post created", post })
  } catch (error) {
    res.status(500).json({ message: "Failed to create post", error: error.message })
  }
}

// Get all posts (feed)
exports.getPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("author", "name email") // Populate author details
      .sort({ createdAt: -1 }) // Sort by creation date descending

    res.json({ posts })
  } catch (error) {
    res.status(500).json({ message: "Failed to get posts", error: error.message })
  }
}

// Edit a post
exports.editPost = async (req, res) => {
  try {
    const { id } = req.params
    const { title, content, categories } = req.body
    const post = await Post.findOneAndUpdate(
      { _id: id, author: req.user.id }, // Ensure only author can edit
      { title, content, categories, updatedAt: new Date() },
      { new: true }, // Return the updated document
    )
    if (!post) return res.status(404).json({ message: "Post not found or unauthorized" })
    res.json({ message: "Post updated", post })
  } catch (error) {
    res.status(500).json({ message: "Failed to update post", error: error.message })
  }
}

// Delete a post
exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params
    const post = await Post.findOneAndDelete({ _id: id, author: req.user.id }) // Ensure only author can delete
    if (!post) return res.status(404).json({ message: "Post not found or unauthorized" })
    res.json({ message: "Post deleted" })
  } catch (error) {
    res.status(500).json({ message: "Failed to delete post", error: error.message })
  }
}

// Like/Unlike a post
exports.toggleLike = async (req, res) => {
  try {
    const { id } = req.params
    const post = await Post.findById(id)
    if (!post) return res.status(404).json({ message: "Post not found" })
    const userId = req.user.id
    const liked = post.likes.includes(userId)

    if (liked) {
      post.likes.pull(userId) // Remove like
    } else {
      post.likes.push(userId) // Add like
    }
    await post.save()
    res.json({ message: liked ? "Unliked" : "Liked", likes: post.likes.length })
  } catch (error) {
    res.status(500).json({ message: "Failed to like/unlike post", error: error.message })
  }
}

// Search posts by title/content
exports.searchPosts = async (req, res) => {
  try {
    const { query } = req.query
    if (!query) return res.status(400).json({ message: "Query required" })
    const posts = await Post.find({
      $or: [
        { title: { $regex: query, $options: "i" } }, // Case-insensitive search on title
        { content: { $regex: query, $options: "i" } }, // Case-insensitive search on content
      ],
    }).populate("author", "name email") // Populate author details
    res.json({ posts })
  } catch (error) {
    res.status(500).json({ message: "Failed to search posts", error: error.message })
  }
}
