import { userModel } from "../models/user.model.js";
import tokenBlacklistModel from "../models/blacklist.model.js";

import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// ============================================================
// COOKIE OPTIONS
// ============================================================

const getCookieOptions = () => {
    const isProduction = process.env.NODE_ENV === "production";

    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        path: "/",
    };
};

// ============================================================
// GENERATE ACCESS + REFRESH TOKENS
// ============================================================

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

// ============================================================
// REGISTER
// ============================================================

const registerUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

    if (
        [username, email, password].some(
            (field) => !field || field.trim() === ""
        )
    ) {
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await userModel.findOne({
        $or: [{ username }, { email }],
    });

    if (existedUser) {
        throw new ApiError(
            409,
            "User with email or username already exists"
        );
    }

    const user = await userModel.create({
        username: username.toLowerCase(),
        email,
        password,
    });

    const createdUser = await userModel
        .findById(user._id)
        .select("-password -refreshToken");

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

// ============================================================
// LOGIN
// ============================================================

const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email) {
        throw new ApiError(400, "Email is required");
    }

    if (!password) {
        throw new ApiError(400, "Password is required");
    }

    const user = await userModel.findOne({ email });

    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }

    const {
        accessToken,
        refreshToken,
    } = await generateAccessAndRefereshTokens(user._id);

    const loggedInUser = await userModel
        .findById(user._id)
        .select("-password -refreshToken");

    const cookieOptions = getCookieOptions();

    return res
        .status(200)

        // Access token cookie
        .cookie(
            "accessToken",
            accessToken,
            cookieOptions
        )

        // Refresh token cookie
        .cookie(
            "refreshToken",
            refreshToken,
            cookieOptions
        )

        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                },
                "User logged in successfully"
            )
        );
});

// ============================================================
// LOGOUT
// ============================================================

const logoutUser = asyncHandler(async (req, res) => {
    const token =
        req.cookies?.accessToken ||
        req.header("Authorization")?.replace("Bearer ", "");

    // Blacklist access token
    if (token) {
        await tokenBlacklistModel.create({
            token,
        });
    }

    // Remove refresh token from database
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

    const cookieOptions = getCookieOptions();

    return res
        .status(200)

        .clearCookie(
            "accessToken",
            cookieOptions
        )

        .clearCookie(
            "refreshToken",
            cookieOptions
        )

        .json(
            new ApiResponse(
                200,
                {},
                "User logged out successfully"
            )
        );
});

// ============================================================
// GET CURRENT USER
// ============================================================

const getMe = asyncHandler(async (req, res) => {
    if (!req.user?._id) {
        throw new ApiError(401, "Unauthorized request");
    }

    const user = await userModel
        .findById(req.user._id)
        .select("-password -refreshToken");

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

// ============================================================
// EXPORT
// ============================================================

export {
    registerUser,
    loginUser,
    logoutUser,
    getMe,
};
