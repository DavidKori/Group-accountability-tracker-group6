import React, { createContext, useContext, useState, useCallback } from "react";
import api from "../api/axios.js";

const AssessmentContext = createContext(null);

export function AssessmentProvider({ children }) {
  const [assessment, setAssessment] = useState();
  const [assessments, setAssessments] = useState([]);
  const [selectedAssessment, setSelectedAssessment] = useState();
  const [answers, setAnswers] = useState([]);
  const [answer, setAnswer] = useState();
  const [selectedAnswer, setSelectedAnswer] = useState();
  const [loading, setLoading] = useState(false);

  const saveAssessment = useCallback((data) => {
    if (!data || typeof data !== "object") return;
    setAssessment(data);
  }, []);

  const updateAssessment = useCallback((updates) => {
    setAssessment((current) => (current ? { ...current, ...updates } : null));
  }, []);

  const clearAssessment = useCallback(() => setAssessment(null), []);

  const saveAnswer = useCallback((data) => {
    if (!data || typeof data !== "object") return;
    setAnswer(data);
  }, []);

  const updateAnswer = useCallback((updates) => {
    setAnswer((current) => (current ? { ...current, ...updates } : null));
  }, []);

  const clearAnswer = useCallback(() => setAnswer(null), []);

  const fetchAssessments = useCallback(async (taskId) => {
    setLoading(true);
    try {
      const url = taskId ? `/assessments?task=${taskId}` : "/assessments";
      const response = await api.get(url);
      const data = response?.data ?? [];
      const list = Array.isArray(data) ? data : [];
      setAssessments(list);
      return list;
    } catch (err) {
      //console.error("Failed to fetch assessments:", err);
      setAssessments([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAnswers = useCallback(async (assessmentId) => {
    setLoading(true);
    try {
      const response = await api.get(`/assessments/${assessmentId}/answers`);
      const data = response?.data ?? [];
      const list = Array.isArray(data) ? data : [];
      setAnswers(list);
      return list;
    } catch (err) {
      //console.error("Failed to fetch answers:", err);
      setAnswers([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createAssessment = useCallback(async (payload) => {
    const response = await api.post("/assessments", payload);
    const created = response?.data ?? null;
    if (created) setAssessments((prev) => [created, ...prev]);
    return created;
  }, []);

  const saveAssessmentChanges = useCallback(async (id, updates) => {
    if (!id) return null;
    const response = await api.put(`/assessments/${id}`, updates);
    const updated = response?.data ?? null;
    if (updated) {
      setAssessments((prev) => prev.map((a) => (a._id === id ? updated : a)));
      setAssessment((prev) => (prev && prev._id === id ? updated : prev));
    }
    return updated;
  }, []);

  const deleteAssessment = useCallback(async (id) => {
    if (!id) return false;
    await api.delete(`/assessments/${id}`);
    setAssessments((prev) => prev.filter((a) => a._id !== id));
    setAssessment((prev) => (prev && prev._id === id ? null : prev));
    return true;
  }, []);

  const createAnswer = useCallback(async (assessmentId, payload) => {
    const response = await api.post(
      `/assessments/${assessmentId}/answers`,
      payload,
    );
    const created = response?.data ?? null;
    if (created) {
      setAnswers((prev) => [created, ...prev]);
      setAnswer(created);
    }
    return created;
  }, []);

  const saveAnswerChanges = useCallback(
    async (assessmentId, answerId, updates) => {
      const response = await api.put(
        `/assessments/${assessmentId}/answers/${answerId}`,
        updates,
      );
      const updated = response?.data ?? null;
      if (updated) {
        setAnswers((prev) =>
          prev.map((a) => (a._id === answerId ? updated : a)),
        );
        setAnswer((prev) => (prev && prev._id === answerId ? updated : prev));
      }
      return updated;
    },
    [],
  );

  const deleteAnswer = useCallback(async (assessmentId, answerId) => {
    await api.delete(`/assessments/${assessmentId}/answers/${answerId}`);
    setAnswers((prev) => prev.filter((a) => a._id !== answerId));
    return true;
  }, []);

  const assessAnswer = useCallback(async (assessmentId, answerId, payload) => {
    const response = await api.post(
      `/assessments/${assessmentId}/answers/${answerId}/assess`,
      payload,
    );
    const updated = response?.data ?? null;
    if (updated) {
      setAnswers((prev) => prev.map((a) => (a._id === answerId ? updated : a)));
    }
    return updated;
  }, []);

  const value = {
    assessment,
    assessments,
    setAssessment,
    setAssessments,
    saveAssessment,
    updateAssessment,
    selectedAssessment,
    setSelectedAssessment,
    clearAssessment,
    answers,
    setAnswers,
    answer,
    setAnswer,
    saveAnswer,
    updateAnswer,
    selectedAnswer,
    setSelectedAnswer,
    clearAnswer,
    fetchAssessments,
    fetchAnswers,
    createAssessment,
    saveAssessmentChanges,
    deleteAssessment,
    createAnswer,
    saveAnswerChanges,
    deleteAnswer,
    assessAnswer,
    loading,
    setLoading,
  };

  return (
    <AssessmentContext.Provider value={value}>
      {children}
    </AssessmentContext.Provider>
  );
}

export function useAssessment() {
  const ctx = useContext(AssessmentContext);
  if (!ctx) {
    throw new Error("useAssessment must be used inside an AssessmentProvider");
  }
  return ctx;
}
