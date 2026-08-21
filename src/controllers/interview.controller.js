import {PDFParse} from "pdf-parse";
import {
  generateInterviewReport,
  generateResumePdfFile
} from "../services/ai.service.js";
import interviewReportModel from "../models/interviewReport.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";

/**
 * @description Controller to generate interview report based on user self description, resume and job description.
 */

const generateInterViewReport = asyncHandler(async (req, res) => {
  // Check whether PDF file is uploaded
  if (!req.file) {
    throw new ApiError(400, "Resume PDF is required");
  }

  // Get self description and job description
  const { selfDescription, jobDescription } = req.body;

  // Validate required fields
  if (!selfDescription?.trim()) {
    throw new ApiError(400, "Self description is required");
  }

  if (!jobDescription?.trim()) {
    throw new ApiError(400, "Job description is required");
  }

  // Parse resume PDF
  const resumeContent = await new PDFParse(
    Uint8Array.from(req.file.buffer),
  ).getText();

  // Validate extracted resume content
  if (!resumeContent?.text?.trim()) {
    throw new ApiError(400, "Unable to extract text from the uploaded resume");
  }

  // Generate interview report using AI
  const interViewReportByAi = await generateInterviewReport({
    resume: resumeContent.text,
    selfDescription,
    jobDescription,
  });

  // Save generated interview report in database
  const interviewReport = await interviewReportModel.create({
    user: req.user._id,
    resume: resumeContent.text,
    selfDescription,
    jobDescription,
    ...interViewReportByAi,
  });

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        interviewReport,
        "Interview report generated successfully.",
      ),
    );
});

/**
 * @description Controller to get interview report by interviewId.
 */
const getInterviewReportById = asyncHandler(async (req, res) => {
    const { interviewId } = req.params;

    // Validate interview ID
    if (!interviewId) {
        throw new ApiError(400, "Interview report ID is required");
    }

    // Find interview report for the logged-in user
    const interviewReport = await interviewReportModel.findOne({
        _id: interviewId,
        user: req.user.id,
    });

    // Check if report exists
    if (!interviewReport) {
        throw new ApiError(404, "Interview report not found");
    }

    // Send successful response
    return res.status(200).json(
        new ApiResponse(
            200,
            interviewReport,
            "Interview report fetched successfully."
        )
    );
});

/**
 * @description Controller to get all interview reports of logged in user.
 */
const getAllInterviewReports = asyncHandler(async (req, res) => {
    const interviewReports = await interviewReportModel
        .find({ user: req.user.id })
        .sort({ createdAt: -1 })
        .select(
            "-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan"
        );

    if (!interviewReports) {
        throw new ApiError(
            404,
            "No interview reports found."
        );
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            interviewReports,
            "Interview reports fetched successfully."
        )
    );
});

/**
 * @description Controller to generate resume PDF based on user self description, resume and job description.
 */
const generateResumePdf = asyncHandler(async (req, res) => {
    const { interviewReportId } = req.params;

    // Validate interview report ID
    if (!interviewReportId) {
        throw new ApiError(
            400,
            "Interview report ID is required"
        );
    }

    // Find interview report
    const interviewReport = await interviewReportModel.findOne({
        _id: interviewReportId,
        user: req.user.id,
    });

    // Check if interview report exists
    if (!interviewReport) {
        throw new ApiError(
            404,
            "Interview report not found."
        );
    }

    // Extract required data from interview report
    const {
        resume,
        jobDescription,
        selfDescription,
    } = interviewReport;

    // Generate resume PDF
    const pdfBuffer = await generateResumePdfFile({
        resume,
        jobDescription,
        selfDescription,
    });

    // Validate generated PDF
    if (!pdfBuffer) {
        throw new ApiError(
            500,
            "Failed to generate resume PDF."
        );
    }

    // Set PDF response headers
    res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`,
    });

    // Send PDF
    return res.send(pdfBuffer);
});

export {
  generateInterViewReport,
  getInterviewReportById,
  getAllInterviewReports,
  generateResumePdf,
};
