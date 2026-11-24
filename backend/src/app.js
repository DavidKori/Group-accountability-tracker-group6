import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import submissionRoutes from "./routes/submissionRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import lecturerRoutes from "./routes/lecturerRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import moduleRoutes from "./routes/moduleRoutes.js";
import assessmentRoutes from "./routes/assessmentRoutes.js";

dotenv.config();
import { notFound, errorHandler } from "./middlewares/errorMiddleware.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
console.log(process.env.CLIENT_URL);
// Core middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== "production") app.use(morgan("dev"));

// Static uploads (fallback when not using Cloudinary)
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// Health check
app.get("/api/health", (req, res) =>
  res.json({
    status: "ok",
    message: `Group Accountability Tracker Server's Running At: ${process.env.NODE_ENV.toUpperCase()}`,
    time: new Date().toISOString(),
  }),
);

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/assessments", assessmentRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/modules", moduleRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/lecturer", lecturerRoutes);
app.use("/api/admin", adminRoutes);

// 404 + error handler
app.use(notFound);
app.use(errorHandler);

export default app;
