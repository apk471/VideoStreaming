import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    // Get the token from the request
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");
    // Check if the token exists
    if (!token) {
      throw new ApiError(401, "Unauthorized");
    }
    // Verify the token
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // Find the user by the id in the token
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );
    // Check if the user exists
    if (!user) {
      throw new ApiError(401, "Unauthorized");
    }
    // Set the user in the request object
    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Unauthorized");
  }
});
