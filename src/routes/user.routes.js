import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

// Create a new router
const router = Router();

// A route for /api/v1/user/register
router.route("/register").post(
  // Middleware to upload files
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  // Controller to register a new user
  registerUser
);
// A route for /api/v1/user/login
router.route("/login").post(loginUser);

// secured routes

// A route for /api/v1/user/logout
router.route("/logout").post(verifyJWT, logoutUser);

// A route for /api/v1/user/refresh-token
router.route("/refresh-token").post(refreshAccessToken);

export default router;
