import cron from "node-cron";
import Task from "../models/Task.js";
import notificationService from "../services/notificationService.js";

// Runs every hour — notify users about tasks due within 24h
const startDeadlineJob = () => {
  cron.schedule("0 * * * *", async () => {
    try {
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const tasks = await Task.find({
        status: { $ne: "done" },
        dueDate: { $gte: now, $lte: in24h },
        assignedTo: { $ne: null },
      });

      for (const task of tasks) {
        await notificationService.notify({
          user: task.assignedTo,
          message: `Task "${task.title}" is due within 24 hours`,
          link: `/tasks/${task._id}`,
          type: "deadline",
        });
      }
      if (tasks.length)
        console.log(`📅 Sent ${tasks.length} deadline reminders`);
    } catch (err) {
      console.error("Deadline job error:", err.message);
    }
  });
  console.log("⏰ Deadline job scheduled");
};

export default startDeadlineJob;
