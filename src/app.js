import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"

const app = express()

app.use(express.json())
app.use(cookieParser())
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

/* require all the routes here */
import authRouter from "./routes/auth.routes.js"
import interviewRouter from "./routes/interview.routes.js"


/* using all the routes here */
app.use("/api/v1/auth", authRouter)
app.use("/api/v1/interview", interviewRouter)



export { app };