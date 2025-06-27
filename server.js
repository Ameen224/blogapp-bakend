// READFLOW-BAKEND/server.js

const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');

dotenv.config();

const app = express();
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
   
app.get("/",(req,res)=>{
    res.json({message:"you'r bakend is working "})
    console.log("working");
    
 })
  
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);

mongoose.connect(process.env.mongodb)
  .then(() => {
    console.log('MongoDB connected');
app.listen(process.env.PORT, () => {
      console.log(`Server running on port ${process.env.PORT}`);
    });
  })
  .catch((err) => console.error('MongoDB connection failed:', err));
