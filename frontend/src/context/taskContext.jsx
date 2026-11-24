import React, { createContext, useContext, useState, useCallback } from "react";

const TaskContext = createContext(null);

export function TaskProvider({ children }) {
  const [task, setTask] = useState();

  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState();

  const [loading, setLoading] = useState(false);

  // Store task returned by backend
  const saveTask = useCallback((taskData) => {
    if (!taskData || typeof taskData !== "object") {
      return;
    }

    setTask(taskData);
  }, []);

  // Update specific task properties
  const updateTask = useCallback((updates) => {
    setTask((current) => {
      if (!current) return null;

      return {
        ...current,
        ...updates,
      };
    });
  }, []);

  // Clear current task
  const clearTask = useCallback(() => {
    setTask(null);
  }, []);

  const value = {
    task,
    tasks,
    setTask,
    setTasks,
    saveTask,
    updateTask,
    selectedTask,
    setSelectedTask,
    //updateTasks,
    clearTask,
    loading,
    setLoading,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTask() {
  const context = useContext(TaskContext);

  if (!context) {
    throw new Error("useTask must be used inside a TaskProvider");
  }

  return context;
}
