// utils/sendOtpEmail.js

const nodemailer = require('nodemailer');
require('dotenv').config();




const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendOtp(to, otp) {
  try {
    await transporter.sendMail({
      from: `"ReadFlow App" <${process.env.EMAIL_USER}>`,
      to,
      subject: 'Your OTP Code',
      html: `<h3>Your OTP is: ${otp}</h3>`,
    });
    console.log(`OTP sent to ${to}`);
  } catch (err) {
    console.error('Failed to send email:', err.message);
    throw err;
  }
}

module.exports = sendOtp;
