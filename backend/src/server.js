import dotenv from "dotenv";
dotenv.config();
import app from "./app.js";
import connectDB from "./config/db.js";
import startDeadlineJob from "./jobs/deadlineJob.js";
import startReportJob from "./jobs/reportJob.js";

const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(` Server running on port ${PORT}`);
    console.log(` Environment: ${process.env.NODE_ENV || "development"}`);
  });

  // Start cron jobs
  startDeadlineJob();
  startReportJob();
})();

// Graceful shutdown
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err.message);
});
