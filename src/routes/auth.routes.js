import { Router } from 'express'
import {registerUser, loginUser, logoutUser, getMe} from "../controllers/auth.controller.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"

const router = Router()

/**
 * @route POST /api/auth/register
 * @description Register a new user
 * @access Public
 */
router.route("/register").post(registerUser)


/**
 * @route POST /api/auth/login
 * @description login user with email and password
 * @access Public
 */
router.route("/login").post(loginUser)


/**
 * @route GET /api/auth/logout
 * @description clear token from user cookie and add the token in blacklist
 * @access public
 */
router.route("/logout").get(logoutUser)


/**
 * @route GET /api/auth/get-me
 * @description get the current logged in user details
 * @access private
 */
router.route("/get-me").get(verifyJWT, getMe)


export default router;