import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState();

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState();
  const [leaders, setLeaders] = useState();
  const [students, setStudents] = useState();

  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setUserInitials(
      user?.name
        ?.trim()
        .split(" ")
        .map((word) => word[0])
        .join("")
        .toUpperCase(),
    );
  }, [user]);
  const [userInitials, setUserInitials] = useState(
    user?.name
      ?.trim()
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase(),
  );
  // Store task returned by backend
  const saveUser = useCallback((UserData) => {
    if (!UserData || typeof UserData !== "object") {
      return;
    }

    setUser(UserData);
  }, []);

  // Update specific User properties
  const updateUser = useCallback((updates) => {
    setUser((current) => {
      if (!current) return null;

      return {
        ...current,
        ...updates,
      };
    });
  }, []);

  // Clear current User
  const clearUser = useCallback(() => {
    setUser(null);
  }, []);

  const value = {
    user,
    users,
    leaders,
    students,
    selectedUser,
    loading,
    userInitials,
    setStudents,
    //updateUsers,
    setUser,
    setLeaders,
    setUsers,
    saveUser,
    updateUser,
    setSelectedUser,
    clearUser,
    setLoading,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error("useUser must be used inside a UserProvider");
  }

  return context;
}
