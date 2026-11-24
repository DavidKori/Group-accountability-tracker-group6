import React, { createContext, useContext, useState, useCallback } from "react";
import api from "../api/axios.js";

const ModuleContext = createContext(null);

export function ModuleProvider({ children }) {
  const [module, setModule] = useState();
  const [modules, setModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState();
  const [loading, setLoading] = useState(false);

  const saveModule = useCallback((moduleData) => {
    if (!moduleData || typeof moduleData !== "object") return;
    setModule(moduleData);
  }, []);

  const updateModule = useCallback((updates) => {
    setModule((current) => {
      if (!current) return null;
      return { ...current, ...updates };
    });
  }, []);

  const clearModule = useCallback(() => {
    setModule(null);
  }, []);

  const fetchModules = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/modules");
      const data = response?.data?.modules ?? response?.data ?? [];
      const list = Array.isArray(data) ? data : [];
      setModules(list);
      return list;
    } catch (err) {
      //console.error("Failed to fetch modules:", err);
      setModules([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createModule = useCallback(async (payload) => {
    const response = await api.post("/modules", payload);
    const created = response?.data?.module ?? response?.data ?? null;
    if (created) setModules((prev) => [created, ...prev]);
    return created;
  }, []);

  const saveModuleChanges = useCallback(async (id, updates) => {
    if (!id) return null;
    const response = await api.put(`/modules/${id}`, updates);
    const updated = response?.data?.module ?? response?.data ?? null;
    if (updated) {
      setModules((prev) => prev.map((m) => (m._id === id ? updated : m)));
      setModule((prev) => (prev && prev._id === id ? updated : prev));
    }
    return updated;
  }, []);

  const deleteModule = useCallback(async (id) => {
    if (!id) return false;
    await api.delete(`/modules/${id}`);
    setModules((prev) => prev.filter((m) => m._id !== id));
    setModule((prev) => (prev && prev._id === id ? null : prev));
    return true;
  }, []);

  const value = {
    module,
    modules,
    setModule,
    setModules,
    saveModule,
    updateModule,
    selectedModule,
    setSelectedModule,
    clearModule,
    fetchModules,
    createModule,
    saveModuleChanges,
    deleteModule,
    loading,
    setLoading,
  };

  return (
    <ModuleContext.Provider value={value}>{children}</ModuleContext.Provider>
  );
}

export function useModule() {
  const context = useContext(ModuleContext);
  if (!context) {
    throw new Error("useModule must be used inside a ModuleProvider");
  }
  return context;
}
