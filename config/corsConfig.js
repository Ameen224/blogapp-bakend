// config/corsConfig.js
const corsConfig = {
  origin: process.env.FRONTEND_URL || "http://localhost:3000", // Allow your frontend origin
  credentials: true, // Allow cookies to be sent
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}

module.exports = corsConfig

