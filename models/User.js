// READFLOW-BAKEND/models/User.js

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: String,
  category:[{type: mongoose.Schema.Types.ObjectId, ref:'Category'}],
  report: String
 
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);

