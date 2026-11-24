import React, { createContext, useContext, useState, useCallback } from "react";

const SubmissionContext = createContext(null);

export function SubmissionProvider({ children }) {
  const [submission, setSubmission] = useState();

  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState();

  const [loading, setLoading] = useState(false);

  // Store submission returned by backend
  const saveSubmission = useCallback((submissionData) => {
    if (!submissionData || typeof submissionData !== "object") {
      return;
    }

    setSubmission(submissionData);
  }, []);

  // Update specific submission properties
  const updateSubmission = useCallback((updates) => {
    setSubmission((current) => {
      if (!current) return null;

      return {
        ...current,
        ...updates,
      };
    });
  }, []);

  // Clear current submission
  const clearSubmission = useCallback(() => {
    setSubmission(null);
  }, []);

  const value = {
    submission,
    submissions,
    setSubmission,
    setSubmissions,
    saveSubmission,
    updateSubmission,
    selectedSubmission,
    setSelectedSubmission,
    clearSubmission,
    loading,
    setLoading,
  };

  return (
    <SubmissionContext.Provider value={value}>
      {children}
    </SubmissionContext.Provider>
  );
}

export function useSubmission() {
  const context = useContext(SubmissionContext);

  if (!context) {
    throw new Error("useSubmission must be used inside a SubmissionProvider");
  }

  return context;
}
