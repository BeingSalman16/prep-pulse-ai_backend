import {userModel} from "../models/user.model.js";
import tokenBlacklistModel from "../models/blacklist.model.js";

import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Generate Access Token and Refresh Token
const generateAccessAndRefereshTokens = async (userId) => {
    try {
        const user = await userModel.findById(userId);

        if (!user) {
            throw new ApiError(404, "User not found");
        }

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;

        await user.save({
            validateBeforeSave: false,
        });

        return {
            accessToken,
            refreshToken,
        };
    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong while generating refresh and access token"
        );
    }
};

/**
 * @name registerUserController
 * @description Register a new user
 * @access Public
 */
const registerUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

    // Validate required fields
    if (
        [username, email, password].some(
            (field) => !field || field.trim() === ""
        )
    ) {
        throw new ApiError(400, "All fields are required");
    }

    // Check whether user already exists
    const existedUser = await userModel.findOne({
        $or: [{ username }, { email }],
    });

    if (existedUser) {
        throw new ApiError(
            409,
            "User with email or username already exists"
        );
    }

    // Create user
    const user = await userModel.create({
        username: username.toLowerCase(),
        email,
        password,
    });

    // Get created user without sensitive fields
    const createdUser = await userModel.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser) {
        throw new ApiError(
            500,
            "Something went wrong while registering the user"
        );
    }

    return res.status(201).json(
        new ApiResponse(
            201,
            createdUser,
            "User registered successfully"
        )
    );
});

/**
 * @name loginUserController
 * @description Login a user
 * @access Public
 */
const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Validate email
    if (!email) {
        throw new ApiError(400, "Email is required");
    }

    // Validate password
    if (!password) {
        throw new ApiError(400, "Password is required");
    }

    // Find user
    const user = await userModel.findOne({ email });

    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    // Check password
    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }

    // Generate tokens
    const {
        accessToken,
        refreshToken,
    } = await generateAccessAndRefereshTokens(user._id);

    // Get logged-in user without sensitive fields
    const loggedInUser = await userModel.findById(user._id).select(
        "-password -refreshToken"
    );

    // Cookie options
    const options = {
        httpOnly: true,
        secure: false, // true in production with HTTPS
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken,
                },
                "User logged in successfully"
            )
        );
});

/**
 * @name logoutUserController
 * @description
 * Logout user, blacklist access token,
 * remove refresh token from database
 * @access Private
 */
const logoutUser = asyncHandler(async (req, res) => {
    // Get access token from cookie or Authorization header
    const token =
        req.cookies?.accessToken ||
        req.header("Authorization")?.replace("Bearer ", "");

    // Add access token to blacklist
    if (token) {
        await tokenBlacklistModel.create({
            token,
        });
    }

    // Remove refresh token from user's database record
    if (req.user?._id) {
        await userModel.findByIdAndUpdate(
            req.user._id,
            {
                $unset: {
                    refreshToken: 1,
                },
            },
            {
                new: true,
            }
        );
    }

    // Cookie options
    const options = {
        httpOnly: true,
        secure: false, // true in production with HTTPS
    };

    // Clear authentication cookies
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(
                200,
                {},
                "User logged out successfully"
            )
        );
});

/**
 * @name getMeController
 * @description Get current logged-in user details
 * @access Private
 */
const getMe = asyncHandler(async (req, res) => {
    const user = await userModel.findById(req.user._id).select(
        "-password -refreshToken"
    );

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                id: user._id,
                username: user.username,
                email: user.email,
            },
            "User details fetched successfully"
        )
    );
});

// Export controllers
export {
    registerUser,
    loginUser,
    logoutUser,
    getMe,
};