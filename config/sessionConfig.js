//config/sessionConfig.js
const session = require("express-session")
const MongoStore = require("connect-mongo")

const sessionConfig = {
  secret: process.env.SESSION_SECRET || "supersecretkey", // Use a strong, unique secret in production
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: "sessions",
    ttl: 14 * 24 * 60 * 60, // 14 days
    autoRemove: "interval",
    autoRemoveInterval: 10, // In minutes. Removes expired sessions every 10 minutes
  }),
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Use secure cookies in production
    sameSite: "lax", // 'strict' or 'none' for cross-site requests
  },
}

module.exports = sessionConfig

