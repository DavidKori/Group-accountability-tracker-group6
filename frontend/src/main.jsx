import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import { TaskProvider } from "./context/taskContext.jsx";
import { UserProvider } from "./context/userContext.jsx";
import { GroupProvider } from "./context/groupContext.jsx";
import { SubmissionProvider } from "./context/submissionContext.jsx";
import { ModuleProvider } from "./context/moduleContext.jsx";
import { AssessmentProvider } from "./context/assesmentContext.jsx";
import { NotificationProvider } from "./context/notificationContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <UserProvider>
        <NotificationProvider>
          <TaskProvider>
            <GroupProvider>
              <SubmissionProvider>
                <ModuleProvider>
                  <AssessmentProvider>
                    <App />
                  </AssessmentProvider>
                </ModuleProvider>
              </SubmissionProvider>
            </GroupProvider>
          </TaskProvider>
        </NotificationProvider>
      </UserProvider>
    </BrowserRouter>
  </StrictMode>,
);
