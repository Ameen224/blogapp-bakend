# ReadFlow Backend

This is the backend for the ReadFlow application, built with Node.js, Express, and MongoDB. It provides APIs for user authentication (OTP and Google OAuth), user management, category management, post creation, comments, and reporting.

## Features

-   **Authentication**:
    -   OTP (One-Time Password) based login/signup.
    -   Google OAuth 2.0 integration.
    -   JWT-based access and refresh tokens.
    -   Session management for OTP flow.
-   **User Management**:
    -   User registration and login.
    -   Profile updates.
    -   Admin panel for managing users (view, update, delete, toggle status, bulk operations, analytics, export).
-   **Category Management**:
    -   Create, update, delete categories (admin only).
    -   View categories (public).
    -   Category analytics (admin only).
-   **Post Management**:
    -   Create, edit, delete posts.
    -   Like/unlike posts.
    -   Search posts.
-   **Comment Management**:
    -   Add and delete comments on posts.
    -   View comments for a post.
-   **Reporting System**:
    -   Users can report posts or other users.
    -   Admins can view all reports.
-   **Security**:
    -   Password hashing with `bcryptjs`.
    -   JWT for token-based authentication.
    -   `helmet` for setting security headers.
    -   `express-rate-limit` for basic rate limiting.
    -   reCAPTCHA verification for OTP requests.
-   **Database**: MongoDB (via Mongoose ODM).

## Setup and Installation

1.  **Clone the repository:**
    \`\`\`bash
    git clone <your-repo-url>
    cd readflow-backend
    \`\`\`

2.  **Install dependencies:**
    \`\`\`bash
    npm install
    \`\`\`

3.  **Create a `.env` file:**
    Create a file named `.env` in the root directory and add the following environment variables:

    \`\`\`env
    PORT=4000
    NODE_ENV=development # or production

    MONGO_URI=mongodb://localhost:27017/readflow # Your MongoDB connection string

    JWT_SECRET=your_jwt_access_secret_key # A strong, random string for JWT access tokens
    JWT_REFRESH_SECRET=your_jwt_refresh_secret_key # A strong, random string for JWT refresh tokens

    SESSION_SECRET=your_express_session_secret # A strong, random string for Express session secret

    FRONTEND_URL=http://localhost:3000 # Your frontend URL (e.g., for Google OAuth redirect)
    SERVER_URL=http://localhost:4000 # Your backend URL (e.g., for Google OAuth callback)

    GOOGLE_CLIENT_ID=your_google_oauth_client_id # Get from Google Cloud Console
    GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret # Get from Google Cloud Console

    RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key # Get from Google reCAPTCHA admin console

    EMAIL_USER=your_email@gmail.com # Your email for sending OTPs (e.g., Gmail)
    EMAIL_PASS=your_email_app_password # Your email password or app-specific password

    ADMIN_SETUP_SECRET=your_admin_setup_secret # A secret key for initial admin registration (e.g., a UUID)
    \`\`\`

    **Important Notes for `.env`:**
    -   `JWT_SECRET` and `JWT_REFRESH_SECRET`: Generate long, random strings.
    -   `SESSION_SECRET`: Generate a long, random string.
    -   `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: Obtain these from the Google Cloud Console by setting up an OAuth 2.0 Client ID. Ensure your `SERVER_URL/auth/google/callback` is added as an authorized redirect URI.
    -   `RECAPTCHA_SECRET_KEY`: Obtain this from the Google reCAPTCHA admin console.
    -   `EMAIL_USER` and `EMAIL_PASS`: If using Gmail, you might need to generate an "App password" if you have 2-Factor Authentication enabled.
    -   `ADMIN_SETUP_SECRET`: This is a temporary secret used only for the very first admin user registration. Once an admin is registered, you can remove or change this value.

4.  **Start the server:**
    \`\`\`bash
    npm start # For production
    # or
    npm run dev # If you have nodemon configured in package.json for development
    \`\`\`

    If `npm run dev` is not configured, you can run it directly with `nodemon`:
    \`\`\`bash
    npx nodemon server.js
    \`\`\`

## API Endpoints

The API endpoints are defined in the `routes` directory. Here's a summary:

-   `/`: Health check
-   `/auth`: Authentication routes (Google OAuth, refresh token)
-   `/api/user`: User-specific routes (OTP, profile, logout, current user)
-   `/api/admin`: Admin-specific routes (login, dashboard, user management, category management, system stats, analytics)
-   `/api/categories`: Public category routes
-   `/api/posts`: Post management routes
-   `/api/comments`: Comment management routes
-   `/api/reports`: Reporting routes

Refer to the respective route files for detailed endpoint definitions.

## Database Schema

The Mongoose schemas are defined in the `models` directory:

-   `User.js`: User schema with authentication details, roles, and categories.
-   `Category.js`: Category schema for organizing content.
-   `Post.js`: Post schema with title, content, author, categories, and likes.
-   `Comment.js`: Comment schema for user comments on posts.
-   `Report.js`: Report schema for reporting content or users.

## Contributing

Feel free to fork the repository and contribute.
