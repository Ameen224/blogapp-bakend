// READFLOW-BAKEND/controllers/adminController.js


exports.getDashboardData = (req, res) => {
  res.json({ message: 'Welcome Admin', user: req.user });
};
