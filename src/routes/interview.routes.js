import {Router} from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  generateInterViewReport,
  getInterviewReportById,
  getAllInterviewReports,
  generateResumePdf
  ,
} from "../controllers/interview.controller.js";
import upload from "../middlewares/multer.middleware.js";

const router = Router();

/**
 * @route POST /api/interview/
 * @description generate new interview report on the basis of user self description,resume pdf and job description.
 * @access private
 */
router
  .route("/")
  .post(
    verifyJWT,
    upload.single("resume"),
    generateInterViewReport,
  );

/**
 * @route GET /api/interview/report/:interviewId
 * @description get interview report by interviewId.
 * @access private
 */
router.route(
  "/report/:interviewId").get(
  verifyJWT,
  getInterviewReportById
);

/**
 * @route GET /api/interview/
 * @description get all interview reports of logged in user.
 * @access private
 */
router.route(
  "/",).get(
  verifyJWT,
  getAllInterviewReports,
);

/**
 * @route GET /api/interview/resume/pdf
 * @description generate resume pdf on the basis of user self description, resume content and job description.
 * @access private
 */
router.route(
  "/resume/pdf/:interviewReportId").post(
  verifyJWT,
  generateResumePdf,
);

export default router;
