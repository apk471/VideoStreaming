import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  // code to register a user
  // Get user details
  // validation - not empty, valid email, password length
  // check if user exists: using username , email
  // check for images , check for avatar
  // upload them to cloudinary
  // create a user object - create entry in db
  // remove password and refresh token from the response
  // check for user creation
  // return the response

  const { fullName, username, email, password } = req.body;
  console.log("Email : ", email);
  if (
    [fullName, username, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "Please provide all the required fields");
  }

  const exisitedUser = User.findOne({ $or: [{ username }, { email }] });
  if (exisitedUser) {
    throw new ApiError(409, "User already exists with this username or email");
  }
  console.log(req.files);

  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Please provide avatar image");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(500, "Failed to upload images");
  }

  const user = await User.create({
    fullName,
    username: username.toLowerCase(),
    email,
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Failed to create user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User created"));
});

export { registerUser };
