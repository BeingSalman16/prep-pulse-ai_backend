import { GoogleGenAI } from "@google/genai"
import { z } from "zod"
import { zodToJsonSchema } from "zod-to-json-schema"
import puppeteer from "puppeteer"

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
})


const interviewReportSchema = z.object({
    matchScore: z.number().describe("A score between 0 and 100 indicating how well the candidate's profile matches the job describe"),
    technicalQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Technical questions that can be asked in the interview along with their intention and how to answer them"),
    behavioralQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Behavioral questions that can be asked in the interview along with their intention and how to answer them"),
    skillGaps: z.array(z.object({
        skill: z.string().describe("The skill which the candidate is lacking"),
        severity: z.enum([ "low", "medium", "high" ]).describe("The severity of this skill gap, i.e. how important is this skill for the job and how much it can impact the candidate's chances")
    })).describe("List of skill gaps in the candidate's profile along with their severity"),
    preparationPlan: z.array(z.object({
        day: z.number().describe("The day number in the preparation plan, starting from 1"),
        focus: z.string().describe("The main focus of this day in the preparation plan, e.g. data structures, system design, mock interviews etc."),
        tasks: z.array(z.string()).describe("List of tasks to be done on this day to follow the preparation plan, e.g. read a specific book or article, solve a set of problems, watch a video etc.")
    })).describe("A day-wise preparation plan for the candidate to follow in order to prepare for the interview effectively"),
    title: z.string().describe("The title of the job for which the interview report is generated"),
})

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {


    const prompt = `Generate an interview report for a candidate with the following details:
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}
`

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(interviewReportSchema),
        }
    })

    return JSON.parse(response.text)


}



async function generatePdfFromHtml(htmlContent) {
    const browser = await puppeteer.launch()
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" })

    const pdfBuffer = await page.pdf({
        format: "A4", margin: {
            top: "20mm",
            bottom: "20mm",
            left: "15mm",
            right: "15mm"
        }
    })

    await browser.close()

    return pdfBuffer
}

async function generateResumePdfFile({ resume, selfDescription, jobDescription }) {

    const resumePdfSchema = z.object({
        html: z.string().describe("The HTML content of the resume which can be converted to PDF using any library like puppeteer")
    })

    const prompt = `You are an elite Executive Resume Writer and ATS Optimization Specialist. Your task is to generate an exceptionally high-scoring, single-page (1-page) ATS-compliant resume in clean, professional HTML/CSS based on the provided candidate details and target Job Description (JD).

--- CANDIDATE & JOB DETAILS ---
Existing Resume: ${resume}
Self Description / Additional Details: ${selfDescription}
Target Job Description: ${jobDescription}

--- CRITICAL REQUIREMENTS ---

1. STRICT SINGLE-PAGE PRINT CONSTRAINT (No Page Spillovers):
   - The output must fit perfectly on exactly ONE (1) A4 page when rendered via headless browser (Puppeteer / print-to-PDF).
   - Use standard A4 page dimensions in CSS: \`@page { size: A4; margin: 0.4in; }\`
   - Set base font size to 10px-11px, line-height to 1.3-1.4, and tight margin/padding between sections (margin-bottom: 8px-12px) to prevent multi-page overflow.
   - Use single-column standard layout. Avoid complex multi-column grids or sidebars as they reduce ATS parsing accuracy.

2. HIGH-SCORING ATS OPTIMIZATION & KEYWORD MATCHING:
   - Extract hard skills, frameworks, tools, methodologies, and technical keywords directly from the target Job Description.
   - Naturally integrate these keywords throughout the Professional Summary, Work Experience, Skills, and Projects sections.
   - Use universally recognized ATS section titles: "Professional Summary", "Technical Skills", "Work Experience", "Projects", "Education", "Certifications".
   - Do NOT use icons, non-standard unicode characters, tables for layout, or SVG charts.

3. HUMAN-LIKE, IMPACT-DRIVEN CONTENT (XYZ Formula):
   - Write like a seasoned professional, avoiding generic AI clichés (e.g., "results-driven visionary", "spearheaded synergy").
   - Structure experience and project bullet points using Google's X-Y-Z formula: "Accomplished [X] as measured by [Y], by doing [Z]".
   - Quantify achievements with concrete metrics (e.g., percentages, latencies, load times, revenue, scale) wherever applicable.

4. CLEAN, PROFESSIONAL STYLING (Puppeteer Ready):
   - Embed all CSS directly inside a \`<style>\` tag inside the \`<head>\`.
   - Typography: Use standard ATS-safe fonts: \`font-family: Arial, Helvetica, 'Segoe UI', sans-serif;\`.
   - Palette: Clean monochrome with subtle dark navy/slate accents for section headers (\`#1e293b\` or \`#0f172a\`), dark gray text for readability (\`#334155\`), and light borders (\`#e2e8f0\`).
   - Include complete boilerplate: \`<!DOCTYPE html><html><head>...</head><body>...</body></html>\`.

5. JSON OUTPUT FORMAT:
   - Return ONLY a valid JSON object without any surrounding markdown backticks (no \`\`\`json).
   - JSON structure:
   {
     "html": "<!DOCTYPE html><html>...complete resume HTML/CSS...</html>"
   }`;

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(resumePdfSchema),
        }
    })


    const jsonContent = JSON.parse(response.text)

    const pdfBuffer = await generatePdfFromHtml(jsonContent.html)

    return pdfBuffer

}

export {
    generateInterviewReport,
    generateResumePdfFile,
};