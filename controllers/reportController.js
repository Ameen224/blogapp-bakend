// controllers/reportController.js
const Report = require("../models/Report")
// You might also need Post, User, Comment models for validation or detailed responses
const Post = require("../models/Post")
const User = require("../models/User")
const Comment = require("../models/Comment")

// Report a post or user
exports.createReport = async (req, res) => {
  try {
    const { type, targetId, reason } = req.body

    if (!["post", "user", "comment"].includes(type)) {
      // Added 'comment'
      return res.status(400).json({ message: "Invalid report type" })
    }

    // Optional: Validate if targetId exists for the given type
    let targetExists = false
    if (type === "post") {
      targetExists = await Post.findById(targetId)
    } else if (type === "user") {
      targetExists = await User.findById(targetId)
    } else if (type === "comment") {
      targetExists = await Comment.findById(targetId)
    }

    if (!targetExists) {
      return res.status(404).json({ message: `${type.charAt(0).toUpperCase() + type.slice(1)} not found` })
    }

    const report = await Report.create({ type, targetId, reporter: req.user.id, reason })
    res.status(201).json({ message: "Report submitted", report })
  } catch (error) {
    res.status(500).json({ message: "Failed to submit report", error: error.message })
  }
}

// (Optional) Get all reports (admin)
exports.getAllReports = async (req, res) => {
  try {
    const reports = await Report.find()
      .populate("reporter", "name email") // Populate reporter details
      .populate({
        path: "targetId", // Populate the target based on its type
        model: (doc) => {
          if (doc.type === "post") return "Post"
          if (doc.type === "user") return "User"
          if (doc.type === "comment") return "Comment"
          return null
        },
        select: "title email content name", // Select relevant fields for each type
      })
      .sort({ createdAt: -1 }) // Sort by creation date descending

    res.json({ reports })
  } catch (error) {
    res.status(500).json({ message: "Failed to get reports", error: error.message })
  }
}
