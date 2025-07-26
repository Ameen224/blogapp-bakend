// config/passport.js
const passport = require("passport")
const GoogleStrategy = require("passport-google-oauth20").Strategy
const LocalStrategy = require("passport-local").Strategy
const User = require("../models/User")

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.SERVER_URL}/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id })

        if (user) {
          // Update user's last login
          await user.updateLastLogin()
          done(null, user)
        } else {
          // Create new user if not found
          user = await User.create({
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value,
            role: "user", // Default role for new users
            isActive: true,
            lastLogin: new Date(),
          })
          done(null, user)
        }
      } catch (err) {
        done(err, null)
      }
    },
  ),
)

// Local Strategy (for potential future username/password login or admin login)
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        const user = await User.findOne({ email })
        if (!user) {
          return done(null, false, { message: "Incorrect email." })
        }
        const isMatch = await user.comparePassword(password)
        if (!isMatch) {
          return done(null, false, { message: "Incorrect password." })
        }
        // Update user's last login
        await user.updateLastLogin()
        return done(null, user)
      } catch (err) {
        return done(err)
      }
    },
  ),
)

// Serialize and deserialize user (for session management, if used)
passport.serializeUser((user, done) => {
  done(null, user.id)
})

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id)
    done(null, user)
  } catch (err) {
    done(err, null)
  }
})
