// READFLOW-BAKEND/controllers/adminController.js

const User = require("../models/User")
const Category = require("../models/Category")
const jwt = require("jsonwebtoken")
const { validationResult } = require("express-validator")

// Generate tokens for admin
const generateTokens = (user) => {
  const accessToken = jwt.sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  })
  const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" })
  return { accessToken, refreshToken }
}

// Admin login
exports.adminLogin = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Validation failed", errors: errors.array() })
    }
    const { email, password } = req.body
    // Find admin user
    const admin = await User.findOne({ email, role: "admin", isActive: true })
    if (!admin) {
      return res.status(401).json({ message: "Invalid credentials", invalidCredentials: true })
    }
    // Check password
    const isValidPassword = await admin.comparePassword(password)
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid credentials", invalidCredentials: true })
    }
    // Update last login
    await admin.updateLastLogin()
    // Generate tokens
    const tokens = generateTokens(admin)
    // Set refresh token cookie
    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })
    res.json({
      message: "Admin login successful",
      accessToken: tokens.accessToken,
      user: { id: admin._id, email: admin.email, name: admin.name, role: admin.role, lastLogin: admin.lastLogin },
    })
  } catch (error) {
    console.error("Error in adminLogin:", error)
    res
      .status(500)
      .json({ message: "Login failed", error: process.env.NODE_ENV === "development" ? error.message : undefined })
  }
}

// Admin signup (for initial setup)
exports.adminSignup = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Validation failed", errors: errors.array() })
    }
    const { email, password, name, secretKey } = req.body
    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: "admin" })
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists", adminExists: true })
    }
    // Verify secret key (for security)
    if (secretKey !== process.env.ADMIN_SETUP_SECRET) {
      return res.status(401).json({ message: "Invalid setup secret key", invalidSecret: true })
    }
    // Create admin user
    const admin = await User.create({ email, password, name, role: "admin" })
    res.json({
      message: "Admin created successfully",
      admin: { id: admin._id, email: admin.email, name: admin.name, role: admin.role },
    })
  } catch (error) {
    console.error("Error in adminSignup:", error)
    res.status(500).json({
      message: "Failed to create admin",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// Get dashboard data
exports.getDashboardData = async (req, res) => {
  try {
    const [userCount, categoryCount, recentUsers, categoriesWithStats] = await Promise.all([
      User.countDocuments({ role: "user" }),
      Category.countDocuments({ isActive: true }),
      User.find({ role: "user" }).sort({ createdAt: -1 }).limit(5).select("name email createdAt lastLogin categories"),
      Category.find({ isActive: true }).populate("createdBy", "name email").sort({ usageCount: -1 }),
    ])
    res.json({
      stats: {
        totalUsers: userCount,
        totalCategories: categoryCount,
        activeUsers: await User.countDocuments({
          role: "user",
          lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        }),
      },
      recentUsers,
      topCategories: categoriesWithStats.slice(0, 5),
    })
  } catch (error) {
    console.error("Error in getDashboardData:", error)
    res.status(500).json({
      message: "Failed to get dashboard data",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// Get all users with pagination
exports.getAllUsers = async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 10
    const search = req.query.search || ""
    const skip = (page - 1) * limit
    const searchQuery = search
      ? {
          role: "user",
          $or: [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }],
        }
      : { role: "user" }
    const [users, total] = await Promise.all([
      User.find(searchQuery)
        .select("name email categories createdAt lastLogin isActive")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(searchQuery),
    ])
    res.json({ users, pagination: { current: page, pages: Math.ceil(total / limit), total, limit } })
  } catch (error) {
    console.error("Error in getAllUsers:", error)
    res.status(500).json({
      message: "Failed to get users",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// Create new category
exports.createCategory = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Validation failed", errors: errors.array() })
    }
    const { name, displayName, description, color, icon } = req.body
    // Check if category already exists
    const existingCategory = await Category.findOne({ name: name.toLowerCase() })
    if (existingCategory) {
      return res.status(400).json({ message: "Category already exists", categoryExists: true })
    }
    // Create category
    const category = await Category.create({
      name: name.toLowerCase(),
      displayName,
      description,
      color,
      icon,
      createdBy: req.user.id,
    })
    res.status(201).json({ message: "Category created successfully", category })
  } catch (error) {
    console.error("Error in createCategory:", error)
    res.status(500).json({
      message: "Failed to create category",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// Update category
exports.updateCategory = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Validation failed", errors: errors.array() })
    }
    const { id } = req.params
    const { displayName, description, color, icon, isActive } = req.body
    const category = await Category.findById(id)
    if (!category) {
      return res.status(404).json({ message: "Category not found" })
    }
    // Update category
    Object.assign(category, { displayName, description, color, icon, isActive, updatedAt: new Date() })
    await category.save()
    res.json({ message: "Category updated successfully", category })
  } catch (error) {
    console.error("Error in updateCategory:", error)
    res.status(500).json({
      message: "Failed to update category",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// Delete category
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params
    const category = await Category.findById(id)
    if (!category) {
      return res.status(404).json({ message: "Category not found" })
    }
    // Check if category is being used by any users
    const usersWithCategory = await User.countDocuments({ categories: category.name })
    if (usersWithCategory > 0) {
      return res.status(400).json({ message: "Cannot delete category that is in use", usersCount: usersWithCategory })
    }
    await Category.findByIdAndDelete(id)
    res.json({ message: "Category deleted successfully" })
  } catch (error) {
    console.error("Error in deleteCategory:", error)
    res.status(500).json({
      message: "Failed to delete category",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// Get all categories
exports.getAllCategories = async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 10
    const search = req.query.search || ""
    const skip = (page - 1) * limit
    const searchQuery = search
      ? { $or: [{ name: { $regex: search, $options: "i" } }, { displayName: { $regex: search, $options: "i" } }] }
      : {}
    const [categories, total] = await Promise.all([
      Category.find(searchQuery).populate("createdBy", "name email").sort({ createdAt: -1 }).skip(skip).limit(limit),
      Category.countDocuments(searchQuery),
    ])
    res.json({ categories, pagination: { current: page, pages: Math.ceil(total / limit), total, limit } })
  } catch (error) {
    console.error("Error in getAllCategories:", error)
    res.status(500).json({
      message: "Failed to get categories",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// Toggle user status
exports.toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params
    const user = await User.findById(id)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }
    if (user.role === "admin") {
      return res.status(400).json({ message: "Cannot modify admin user status" })
    }
    user.isActive = !user.isActive
    await user.save()
    res.json({
      message: `User ${user.isActive ? "activated" : "deactivated"} successfully`,
      user: { id: user._id, name: user.name, email: user.email, isActive: user.isActive },
    })
  } catch (error) {
    console.error("Error in toggleUserStatus:", error)
    res.status(500).json({
      message: "Failed to toggle user status",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// Get user details
exports.getUserDetails = async (req, res) => {
  try {
    const { id } = req.params
    const user = await User.findById(id).select("-password -refreshToken").populate("categories")
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }
    res.json({ user })
  } catch (error) {
    console.error("Error in getUserDetails:", error)
    res.status(500).json({
      message: "Failed to get user details",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// Admin logout
exports.adminLogout = async (req, res) => {
  try {
    res.clearCookie("refreshToken")
    res.json({ message: "Logged out successfully" })
  } catch (error) {
    console.error("Error in adminLogout:", error)
    res
      .status(500)
      .json({ message: "Logout failed", error: process.env.NODE_ENV === "development" ? error.message : undefined })
  }
}

// Refresh admin token
exports.refreshAdminToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies
    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token provided" })
    }
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
    const admin = await User.findById(decoded.id)
    if (!admin || admin.role !== "admin" || !admin.isActive) {
      return res.status(401).json({ message: "Invalid refresh token" })
    }
    const tokens = generateTokens(admin)
    // Set new refresh token cookie
    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })
    res.json({
      accessToken: tokens.accessToken,
      user: { id: admin._id, email: admin.email, name: admin.name, role: admin.role },
    })
  } catch (error) {
    console.error("Error in refreshAdminToken:", error)
    res.status(401).json({ message: "Invalid refresh token" })
  }
}

// Get system stats
exports.getSystemStats = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const [totalUsers, totalCategories, activeUsers, newUsersThisMonth, newUsersThisWeek, mostUsedCategories] =
      await Promise.all([
        User.countDocuments({ role: "user" }),
        Category.countDocuments({ isActive: true }),
        User.countDocuments({ role: "user", lastLogin: { $gte: thirtyDaysAgo } }),
        User.countDocuments({ role: "user", createdAt: { $gte: thirtyDaysAgo } }),
        User.countDocuments({ role: "user", createdAt: { $gte: sevenDaysAgo } }),
        Category.find({ isActive: true }).sort({ usageCount: -1 }).limit(5).select("name displayName usageCount"),
      ])
    res.json({
      totalUsers,
      totalCategories,
      activeUsers,
      newUsersThisMonth,
      newUsersThisWeek,
      mostUsedCategories,
      systemHealth: {
        status: "healthy",
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date(),
      },
    })
  } catch (error) {
    console.error("Error in getSystemStats:", error)
    res.status(500).json({
      message: "Failed to get system stats",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// Bulk user operations
exports.bulkUserOperations = async (req, res) => {
  try {
    const { operation, userIds } = req.body
    if (!operation || !userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ message: "Invalid request data" })
    }
    let result
    switch (operation) {
      case "activate":
        result = await User.updateMany({ _id: { $in: userIds }, role: "user" }, { isActive: true })
        break
      case "deactivate":
        result = await User.updateMany({ _id: { $in: userIds }, role: "user" }, { isActive: false })
        break
      case "delete":
        result = await User.deleteMany({ _id: { $in: userIds }, role: "user" })
        break
      default:
        return res.status(400).json({ message: "Invalid operation" })
    }
    res.json({
      message: `Bulk ${operation} completed successfully`,
      affectedUsers: result.modifiedCount || result.deletedCount,
    })
  } catch (error) {
    console.error("Error in bulkUserOperations:", error)
    res.status(500).json({
      message: "Bulk operation failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// Export user data
exports.exportUserData = async (req, res) => {
  try {
    const { format = "json" } = req.query
    const users = await User.find({ role: "user" })
      .select("name email categories createdAt lastLogin isActive")
      .sort({ createdAt: -1 })
    if (format === "csv") {
      const csvData = users.map((user) => ({
        Name: user.name,
        Email: user.email,
        Categories: user.categories.join(", "),
        "Created At": user.createdAt.toISOString(),
        "Last Login": user.lastLogin ? user.lastLogin.toISOString() : "Never",
        Active: user.isActive ? "Yes" : "No",
      }))
      res.setHeader("Content-Type", "text/csv")
      res.setHeader("Content-Disposition", "attachment; filename=users.csv")
      // Simple CSV conversion
      const csvHeaders = Object.keys(csvData[0]).join(",")
      const csvRows = csvData.map((row) =>
        Object.values(row)
          .map((value) => `"${value}"`)
          .join(","),
      )
      res.send([csvHeaders, ...csvRows].join("\n"))
    } else {
      res.json({ timestamp: new Date(), totalUsers: users.length, users })
    }
  } catch (error) {
    console.error("Error in exportUserData:", error)
    res.status(500).json({
      message: "Failed to export user data",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// Get user analytics
exports.getUserAnalytics = async (req, res) => {
  try {
    const { period = "30d" } = req.query
    let dateRange
    switch (period) {
      case "7d":
        dateRange = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        break
      case "30d":
        dateRange = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        break
      case "90d":
        dateRange = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        break
      default:
        dateRange = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    }
    const [userRegistrations, userActivity, categoryUsage, inactiveUsers] = await Promise.all([
      User.aggregate([
        { $match: { role: "user", createdAt: { $gte: dateRange } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      User.aggregate([
        { $match: { role: "user", lastLogin: { $gte: dateRange } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$lastLogin" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      User.aggregate([
        { $match: { role: "user" } },
        { $unwind: "$categories" },
        { $group: { _id: "$categories", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      User.countDocuments({
        role: "user",
        $or: [{ lastLogin: { $lt: dateRange } }, { lastLogin: { $exists: false } }],
      }),
    ])
    res.json({ period, userRegistrations, userActivity, categoryUsage, inactiveUsers, generatedAt: new Date() })
  } catch (error) {
    console.error("Error in getUserAnalytics:", error)
    res.status(500).json({
      message: "Failed to get user analytics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// Send notification to users
exports.sendNotification = async (req, res) => {
  try {
    const { title, message, userIds, notificationType = "info" } = req.body
    if (!title || !message) {
      return res.status(400).json({ message: "Title and message are required" })
    }
    // If userIds provided, send to specific users, otherwise send to all
    const targetUsers = userIds
      ? await User.find({ _id: { $in: userIds }, role: "user" })
      : await User.find({ role: "user", isActive: true })
    // In a real application, you would integrate with a notification service
    // For now, we'll just log the notification
    console.log(`Sending notification to ${targetUsers.length} users:`, {
      title,
      message,
      type: notificationType,
      timestamp: new Date(),
    })
    // You could store notifications in a separate collection
    // or integrate with services like Firebase Cloud Messaging, OneSignal, etc.
    res.json({ message: "Notification sent successfully", recipientCount: targetUsers.length })
  } catch (error) {
    console.error("Error in sendNotification:", error)
    res.status(500).json({
      message: "Failed to send notification",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// Get category analytics
exports.getCategoryAnalytics = async (req, res) => {
  try {
    const [categoryUsage, categoryGrowth, unusedCategories] = await Promise.all([
      Category.aggregate([
        { $match: { isActive: true } },
        { $lookup: { from: "users", localField: "name", foreignField: "categories", as: "users" } },
        { $project: { name: 1, displayName: 1, usageCount: { $size: "$users" }, createdAt: 1 } },
        { $sort: { usageCount: -1 } },
      ]),
      Category.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Category.aggregate([
        { $match: { isActive: true } },
        { $lookup: { from: "users", localField: "name", foreignField: "categories", as: "users" } },
        { $match: { users: { $size: 0 } } },
        { $project: { name: 1, displayName: 1, createdAt: 1 } },
      ]),
    ])
    res.json({ categoryUsage, categoryGrowth, unusedCategories, generatedAt: new Date() })
  } catch (error) {
    console.error("Error in getCategoryAnalytics:", error)
    res.status(500).json({
      message: "Failed to get category analytics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// System maintenance operations
exports.performMaintenance = async (req, res) => {
  try {
    const { operation } = req.body
    let result = {}
    switch (operation) {
      case "cleanup_inactive_users":
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        const inactiveUsers = await User.deleteMany({
          role: "user",
          isActive: false,
          lastLogin: { $lt: thirtyDaysAgo },
        })
        result = { deletedUsers: inactiveUsers.deletedCount }
        break
      case "update_category_usage":
        const categories = await Category.find({ isActive: true })
        for (const category of categories) {
          const usageCount = await User.countDocuments({ categories: category.name })
          await Category.findByIdAndUpdate(category._id, { usageCount })
        }
        result = { updatedCategories: categories.length }
        break
      case "optimize_database":
        // In a real application, you might run database optimization commands
        result = { message: "Database optimization completed" }
        break
      default:
        return res.status(400).json({ message: "Invalid maintenance operation" })
    }
    res.json({ message: `Maintenance operation '${operation}' completed successfully`, result, timestamp: new Date() })
  } catch (error) {
    console.error("Error in performMaintenance:", error)
    res.status(500).json({
      message: "Maintenance operation failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// Get audit logs (if you have an audit system)
exports.getAuditLogs = async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit
    // This would require an AuditLog model in a real application
    // For now, we'll return a placeholder response
    const mockAuditLogs = [
      {
        _id: "mock1",
        action: "USER_LOGIN",
        userId: "user123",
        adminId: req.user.id,
        timestamp: new Date(),
        details: { ip: "192.168.1.1" },
      },
      {
        _id: "mock2",
        action: "CATEGORY_CREATED",
        userId: null,
        adminId: req.user.id,
        timestamp: new Date(),
        details: { categoryName: "Technology" },
      },
    ]
    res.json({ logs: mockAuditLogs, pagination: { current: page, pages: 1, total: mockAuditLogs.length, limit } })
  } catch (error) {
    console.error("Error in getAuditLogs:", error)
    res.status(500).json({
      message: "Failed to get audit logs",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params
    const { name, email, isActive, categories } = req.body
    const user = await User.findById(id)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    if (user.role === "admin") {
      return res.status(400).json({ message: "Cannot modify admin user via this route" })
    }

    // Update user fields
    if (name) user.name = name
    if (email) user.email = email
    if (typeof isActive === "boolean") user.isActive = isActive
    if (Array.isArray(categories)) {
      // Ensure categories exist before assigning
      const existingCategories = await Category.find({ name: { $in: categories } }).select("name")
      const validCategoryNames = existingCategories.map((cat) => cat.name)
      user.categories = validCategoryNames
    }

    await user.save()

    res.json({
      message: "User updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
        categories: user.categories,
        lastLogin: user.lastLogin,
      },
    })
  } catch (error) {
    console.error("Error in updateUser:", error)
    res.status(500).json({
      message: "Failed to update user",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params
    const user = await User.findById(id)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    if (user.role === "admin") {
      return res.status(400).json({ message: "Cannot delete admin user" })
    }

    await User.findByIdAndDelete(id)
    res.json({ message: "User deleted successfully" })
  } catch (error) {
    console.error("Error in deleteUser:", error)
    res.status(500).json({
      message: "Failed to delete user",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// Get admin profile
exports.getAdminProfile = async (req, res) => {
  try {
    // req.user is set by adminAuthMiddleware
    const admin = await User.findById(req.user.id).select("-password -refreshToken")
    if (!admin || admin.role !== "admin") {
      return res.status(404).json({ message: "Admin profile not found" })
    }
    res.json({ admin })
  } catch (error) {
    console.error("Error in getAdminProfile:", error)
    res.status(500).json({
      message: "Failed to get admin profile",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// Update admin profile
exports.updateAdminProfile = async (req, res) => {
  try {
    const { name, email } = req.body
    // Password update should be a separate, secure route
    // req.user is set by adminAuthMiddleware
    const admin = await User.findById(req.user.id)
    if (!admin || admin.role !== "admin") {
      return res.status(404).json({ message: "Admin profile not found" })
    }

    if (name) admin.name = name
    if (email) admin.email = email

    await admin.save()

    res.json({
      message: "Admin profile updated successfully",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    })
  } catch (error) {
    console.error("Error in updateAdminProfile:", error)
    res.status(500).json({
      message: "Failed to update admin profile",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}
