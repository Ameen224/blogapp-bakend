// utils/sendOtpEmail.js

const nodemailer = require("nodemailer")

const sendOtpEmail = async (email, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail", // You can use other services or SMTP
      auth: {
        user: process.env.EMAIL_USER, // Your email address
        pass: process.env.EMAIL_PASS, // Your email password or app password
      },
    })

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your ReadFlow OTP",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #0056b3;">Your One-Time Password (OTP)</h2>
          <p>Hello,</p>
          <p>Thank you for using ReadFlow. Your One-Time Password (OTP) for login is:</p>
          <h3 style="background-color: #f0f0f0; padding: 10px; border-radius: 5px; display: inline-block; letter-spacing: 2px;">${otp}</h3>
          <p>This OTP is valid for 5 minutes. Please do not share this code with anyone.</p>
          <p>If you did not request this, please ignore this email.</p>
          <p>Best regards,<br/>The ReadFlow Team</p>
        </div>
      `,
    }

    await transporter.sendMail(mailOptions)
    console.log(`OTP sent to ${email}`)
  } catch (error) {
    console.error(`Error sending OTP to ${email}:`, error)
    throw new Error("Failed to send OTP email")
  }
}

module.exports = sendOtpEmail
