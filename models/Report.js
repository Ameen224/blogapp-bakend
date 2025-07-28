const mongoose = require("mongoose")

const reportSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["post", "user", "comment"], // Added 'comment' as a possible report type
    required: true,
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: "type", // Dynamically reference 'Post', 'User', or 'Comment' model
  },
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  reason: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ["pending", "reviewed", "resolved", "rejected"],
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

const Report = mongoose.model("Report", reportSchema)

module.exports = Report
