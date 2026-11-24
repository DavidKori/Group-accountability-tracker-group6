import React, { createContext, useContext, useState, useCallback } from "react";

const GroupContext = createContext(null);

export function GroupProvider({ children }) {
  const [group, setGroup] = useState();

  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState();

  const [loading, setLoading] = useState(false);

  // Store group returned by backend
  const saveGroup = useCallback((groupData) => {
    if (!groupData || typeof groupData !== "object") {
      return;
    }

    setGroup(groupData);
  }, []);

  // Update specific group properties
  const updateGroup = useCallback((updates) => {
    setGroup((current) => {
      if (!current) return null;

      return {
        ...current,
        ...updates,
      };
    });
  }, []);

  // Clear current group
  const clearGroup = useCallback(() => {
    setGroup(null);
  }, []);

  const value = {
    group,
    groups,
    setGroup,
    setGroups,
    saveGroup,
    updateGroup,
    selectedGroup,
    setSelectedGroup,
    clearGroup,
    loading,
    setLoading,
  };

  return (
    <GroupContext.Provider value={value}>{children}</GroupContext.Provider>
  );
}

export function useGroup() {
  const context = useContext(GroupContext);

  if (!context) {
    throw new Error("useGroup must be used inside a GroupProvider");
  }

  return context;
}
