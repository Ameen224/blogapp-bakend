// routes/adminRoutes.js

const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { adminAuthMiddleware } = require("../middlewares/authMiddleware");

// Admin Authentication
router.post("/register", adminController.adminSignup);
router.post("/login", adminController.adminLogin);
router.post("/logout", adminAuthMiddleware, adminController.adminLogout);
router.get("/refresh", adminController.refreshAdminToken);

//  Dashboard & System
router.get("/dashboard", adminAuthMiddleware, adminController.getDashboardData);
router.get("/system/stats", adminAuthMiddleware, adminController.getSystemStats);
router.post("/system/maintenance", adminAuthMiddleware, adminController.performMaintenance);
router.get("/system/audit-logs", adminAuthMiddleware, adminController.getAuditLogs);

//  Admin Profile
router.get("/profile", adminAuthMiddleware, adminController.getAdminProfile);
router.put("/profile", adminAuthMiddleware, adminController.updateAdminProfile);

//  User Management
router.get("/users", adminAuthMiddleware, adminController.getAllUsers);
router.get("/users/:id", adminAuthMiddleware, adminController.getUserDetails);
router.put("/users/:id", adminAuthMiddleware, adminController.updateUser);
router.delete("/users/:id", adminAuthMiddleware, adminController.deleteUser);

router.put("/users/:id/toggle-status", adminAuthMiddleware, adminController.toggleUserStatus);
router.post("/users/bulk", adminAuthMiddleware, adminController.bulkUserOperations);
router.get("/users/export", adminAuthMiddleware, adminController.exportUserData);
router.get("/users/analytics", adminAuthMiddleware, adminController.getUserAnalytics);
router.post("/users/notify", adminAuthMiddleware, adminController.sendNotification);

// Category Management
router.post("/categories", adminAuthMiddleware, adminController.createCategory);
router.put("/categories/:id", adminAuthMiddleware, adminController.updateCategory);
router.delete("/categories/:id", adminAuthMiddleware, adminController.deleteCategory);
router.get("/categories", adminAuthMiddleware, adminController.getAllCategories);
router.get("/categories/analytics", adminAuthMiddleware, adminController.getCategoryAnalytics);

module.exports = router;
