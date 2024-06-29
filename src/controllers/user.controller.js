import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const generateRefreshAndAcessToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.genrateAccessToken();
    const refreshToken = user.genrateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Failed to generate tokens");
  }
};

// A controller to register a new user
const registerUser = asyncHandler(async (req, res) => {
  // code to register a user -- 1
  // Get user details -- 2
  // validation - not empty, valid email, password length -- 3
  // check if user exists: using username , email -- 4
  // check for images , check for avatar -- 5
  // upload them to cloudinary -- 6
  // create a user object - create entry in db -- 7
  // remove password and refresh token from the response -- 8
  // check for user creation -- 9
  // return the response -- 10

  // 1 and 2
  const { fullName, username, email, password } = req.body;

  // 3
  if (
    [fullName, username, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "Please provide all the required fields");
  }

  // 4
  const exisitedUser = await User.findOne({ $or: [{ username }, { email }] });
  if (exisitedUser) {
    throw new ApiError(409, "User already exists with this username or email");
  }

  // 5 and 6
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;

  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }
  // Avatar is req so do validation check for only avatar
  if (!avatarLocalPath) {
    throw new ApiError(400, "Please provide avatar image");
  }

  // Upload the images to cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(500, "Failed to upload images");
  }

  // 7
  const user = await User.create({
    fullName,
    username: username.toLowerCase(),
    email,
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  // create a user object without password and refresh token -- 8
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // 9
  if (!createdUser) {
    throw new ApiError(500, "Failed to create user");
  }

  // 10
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User created"));
});

// A controller to login a user
const loginUser = asyncHandler(async (req, res) => {
  // req.body -> email, password
  // check if user exists with username or email
  // compare the password
  // generate token
  // send cookie with token

  // get email and password from the request body
  const { email, password, username } = req.body;

  // check if email or username is provided
  if (!email && !username) {
    throw new ApiError(400, "Please provide email or username");
  }

  // find the user with email or username
  const user = await User.findOne({ $or: [{ email }, { username }] });

  // check if user exists
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // check if password is correct
  const isPasswordValid = await user.isPasswordCorrect(password);

  // if password is not correct
  if (!isPasswordValid) {
    throw new ApiError(404, "Invalid User credentials");
  }

  // generate access token and refresh token
  const { accessToken, refreshToken } = await generateRefreshAndAcessToken(
    user._id
  );

  // get the user without password and refresh token
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // send the response with cookies
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged in"
      )
    );
});

// A controller to logout a user
const logoutUser = asyncHandler(async (req, res) => {
  // find user id by getting req.user from the middleware
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: undefined },
    },
    { new: true }
  );

  // clear the cookies
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("refreshToken", options)
    .clearCookie("accessToken", options)
    .json(new ApiResponse(200, {}, "User logged out"));
});

// A controller to refresh the access token
const refreshAccessToken = asyncHandler(async (req, res) => {
  // get the refresh token from the request body or cookies
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  // check if refresh token exists
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized Request");
  }
  // verify the refresh token
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    // find the user by the id in the token
    const user = await User.findById(decodedToken?._id);
    // check if user exists
    if (!user) {
      throw new ApiError(401, "Unauthorized Request");
    }
    // check if the refresh token is valid
    if (user?.refreshToken !== incomingRefreshToken) {
      throw new ApiError(401, "Refresh token is invalid");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };
    // generate new access token and refresh token
    const { accessToken, newRefreshToken } = await generateRefreshAndAcessToken(
      user._id
    );

    return res
      .status(200)
      .cookie("refreshToken", refreshToken, options)
      .cookie("accessToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Token refreshed"
        )
      );
  } catch (error) {
    return res
      .status(401)
      .json(new ApiResponse(401, {}, error?.message || "Invalid Token"));
  }
});

// A controller to change the current password
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  const isPassowordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPassowordCorrect) {
    throw new ApiError(400, "Invalid password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

// a controller to get the current user
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
});

// a controller to update the account details
const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email: email,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

// a controller to update the user avatar
const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  //TODO: delete old image - assignment

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading on avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar image updated successfully"));
});

// a controller to update the user cover image
const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image file is missing");
  }

  //TODO: delete old image - assignment

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading on avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully"));
});

// a controller to get the user channel profile
const getUserChannelProfile = asyncHandler(async (req, res) => {
  // get the username from the request params
  const { username } = req.params;
  // check if username is provided
  if (!username?.trim()) {
    throw new ApiError(400, "username is missing");
  }
  // Aggregate query to get the user channel profile
  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(404, "channel does not exists");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully")
    );
});

// a controller to get the watch history of the user
const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "Watch history fetched successfully"
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
